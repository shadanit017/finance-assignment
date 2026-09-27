# 🏗️ Architecture & Security Pipeline

This document details the complete system architecture, multi-LLM integration, zero-trust RBAC policy enforcement, high-performance data ingestion pipeline, and grounded answer synthesis for the **AI Financial-Insights Assistant**.

---

## 1. End-to-End Execution Pipeline

```mermaid
flowchart TD
    subgraph Client["React Client"]
        UI["User Interface"]
    end

    subgraph Gateway["NestJS API Gateway"]
        AuthGuard["Authentication Guard"]
        UserContext["User Context and Roles"]
    end

    subgraph AIService["AI Query Planner Engine"]
        MultiLLM["Multi-LLM Provider Router"]
        QueryPlan["Structured QueryPlan Generation"]
    end

    subgraph SecurityEngine["Zero-Trust Security Engine"]
        Validator["QueryPlan Validator"]
        PolicyEngine["Server-Side Policy Engine"]
        SqlBuilder["Allowlisted Parameterized SQL Builder"]
    end

    subgraph DataLayer["Database and Data Engine"]
        Postgres[(PostgreSQL 16 Database)]
        DuckDB[DuckDB Bulk Ingestion Engine]
    end

    subgraph ResponseEngine["Grounded Answer Synthesis"]
        Normalizer["Result Normalizer and Evidence Builder"]
        AnswerSynthesizer["AI Grounded Answer Formatter"]
    end

    UI -->|"1. POST /api/assistant/ask"| AuthGuard
    AuthGuard --> UserContext
    UserContext --> MultiLLM
    MultiLLM --> QueryPlan
    QueryPlan --> Validator
    Validator --> PolicyEngine
    PolicyEngine -->|"2a. DENY - Forbidden"| UI
    PolicyEngine -->|"2b. ALLOW"| SqlBuilder
    SqlBuilder -->|"3. Parameterized Safe SQL"| Postgres
    Postgres -->|"4. Raw Database Rows"| Normalizer
    Normalizer --> AnswerSynthesizer
    AnswerSynthesizer -->|"5. Grounded NL Answer + Evidence JSON"| UI

    DuckDB -->|"High-Speed COPY Stream Ingestion"| Postgres
```

---

## 2. Authorization Boundary & Security Principles

The core architectural directive of this platform is: **The AI is NEVER the authorization boundary.**

```
[ User Input ] ---> [ AI Model ] ---> [ Query Plan JSON ] ---> [ Server Policy Enforcement ] ---> [ Parameterized SQL ] ---> [ PostgreSQL ]
                                                                        │
                                                                   (RBAC GATE)
                                                                 Allow or Deny
```

### Security Guarantees:
1. **No Direct SQL Execution by AI**: AI models generate structured JSON query plans (`QueryPlan`), never raw SQL strings.
2. **Strict Server-Side Validation**: The `QueryPlanValidator` checks column allowlists, function allowlists, and enforces parameter safety (`$1`, `$2`).
3. **Field-Level RBAC Policy Check**: The backend `PolicyService` inspects requested fields (`transaction_id`, `account_id`, `customer_id`, `device_id`). If an unprivileged user (e.g., `Viewer` or `Analyst`) attempts to query sensitive entity identifiers, the server blocks execution immediately with HTTP `403 Forbidden`.
4. **Parameterized SQL Only**: All dynamic SQL queries are constructed using allowlisted identifiers and parameterized values to prevent SQL injection.
5. **Row Count Guardrails**: Queries requesting row listings are capped at `MAX_ENTITY_ROWS = 100` to prevent memory exhaustion or bulk data exfiltration.

---

## 3. High-Performance Bulk Data Pipeline (5 Million Rows)

```mermaid
sequenceDiagram
    autonumber
    participant Docker as Container Startup
    participant Downloader as download-dataset.ts
    participant Importer as import-dataset.ts
    participant DuckDB as Static DuckDB CLI Engine
    participant Postgres as PostgreSQL Container

    Docker->>Importer: Launch dataset import step
    Importer->>Postgres: SELECT COUNT FROM financial_transactions
    alt Data Already Imported
        Postgres-->>Importer: Row count = 5000000
        Importer-->>Docker: Skip import (Instant startup)
    else Clean Fresh Database
        Importer->>Downloader: Check or Download Hugging Face Parquet
        Importer->>Postgres: Drop PK and Indexes temporarily
        Importer->>DuckDB: Export Parquet to import_temp.csv
        DuckDB-->>Importer: CSV Export Complete
        Importer->>Postgres: Stream CSV via binary COPY protocol
        Postgres-->>Importer: 5000000 rows inserted
        Importer->>Postgres: Re-create Primary Key and B-Tree Indexes
        Importer-->>Docker: Import complete
    end
```

### Ingestion Optimizations:
- **Parquet to CSV Conversion via DuckDB**: Converts 167MB compressed Parquet files into streaming CSV in under 3 seconds using C++ vectorized execution.
- **Index Drop / Re-creation Pattern**: Temporarily drops PostgreSQL indexes before bulk copying to eliminate B-Tree rebalancing overhead during inserts, then rebuilds indexes in parallel.
- **PostgreSQL COPY Protocol**: Uses node `pg-copy-streams` to push raw CSV chunks directly into PostgreSQL's internal binary parser without ORM serialization overhead.

---

## 4. Multi-LLM Provider Routing Architecture

The platform supports seamless switching between multiple leading LLM providers:

```
                          ┌───> Google Gemini 2.5 Flash Engine (@google/genai)
                          │
[ MultiLlmProviderRouter ]├───> Anthropic Claude 3.5 Sonnet (@anthropic-ai/sdk)
                          │
                          └───> OpenAI GPT-4o-mini (openai)
```

- **Dynamic Provider Selection**: The API allows callers to select their target provider or fallback automatically to the active provider key (`GEMINI_API_KEY`, `CLAUDE_API_KEY`, `OPENAI_API_KEY`).
- **Unified Schema Prompting**: All providers receive identical database schema definitions and output rules, producing strict, validated JSON `QueryPlan` outputs.
- **Evidence-Grounded Synthesizer**: After database execution, query results are formatted back to the selected LLM alongside execution metadata to generate natural, grounded answers backed by evidence.

---

## 5. Role-Based Access Control (RBAC) Matrix

| Permission Name | Viewer | Analyst | Admin |
| :--- | :---: | :---: | :---: |
| `VIEW_AGGREGATES` | ✅ | ✅ | ✅ |
| `VIEW_TRENDS` | ❌ | ✅ | ✅ |
| `VIEW_COMPARISONS` | ❌ | ✅ | ✅ |
| `VIEW_ENTITY_DETAILS` | ❌ | ❌ | ✅ |
| `VIEW_SENSITIVE_FIELDS` | ❌ | ❌ | ✅ |
| `MANAGE_USERS` | ❌ | ❌ | ✅ |

---

## 6. Directory Layout & Module Responsibilities

- **`backend/src/ai/`**: Multi-LLM providers, system prompts, query plan generation, grounded response formatting.
- **`backend/src/policy/`**: Policy engine, capability mapping, field-level access control.
- **`backend/src/query-execution/`**: SQL Builder service, query execution service, safety sanitizers.
- **`backend/src/auth/`**: Passport Google OAuth 2.0 strategy, Express session management, active user session switching.
- **`backend/scripts/`**: Parquet dataset downloader, DuckDB high-speed import script, dataset verification script.
