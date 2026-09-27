# 📊 AI Financial-Insights Assistant

A full-stack, enterprise-grade AI financial analytics platform built with **NestJS**, **React (Vite)**, **PostgreSQL**, **Prisma ORM**, **Multi-LLM Integration (Google Gemini, Anthropic Claude, OpenAI)**, **DuckDB High-Performance Bulk Ingestion Engine**, and **Google OAuth / RBAC Security**.

---

## ⚡ Quick Start (One Command Setup)

Clone the repository and launch the full stack in **a single command**:

```bash
npm run dev
```

> **What happens automatically:**
> 1. **Docker Orchestration**: Launches PostgreSQL 16 database, NestJS backend, and Vite React frontend containers.
> 2. **Database Migration & Seeding**: Applies database schemas via Prisma (`prisma db push`) and seeds RBAC roles (`Viewer`, `Analyst`, `Admin`) + default demo users.
> 3. **Dataset Download & Bulk Ingestion**: Downloads the 167MB Hugging Face parquet dataset and performs high-speed bulk COPY stream ingestion of **5,000,000 transaction rows** into PostgreSQL (~10–15 seconds total).
> 4. **Hot Reloading Enabled**: Starts both backend and frontend servers with live watch mode (HMR enabled). No manual command execution needed!

---

## 🔑 Seeded Demo Accounts & Login Credentials

The database comes pre-seeded with 3 demo accounts (one for each RBAC role) so you can test role-based permissions immediately:

| Email | Password | Role | Permissions Included |
| :--- | :--- | :--- | :--- |
| `admin@example.com` | `admin123` | **ADMIN** | `VIEW_AGGREGATES`, `VIEW_TRENDS`, `VIEW_COMPARISONS`, `VIEW_ENTITY_DETAILS`, `VIEW_SENSITIVE_FIELDS`, `MANAGE_USERS` |
| `analyst@example.com` | `analyst123` | **ANALYST** | `VIEW_AGGREGATES`, `VIEW_TRENDS`, `VIEW_COMPARISONS` |
| `viewer@example.com` | `viewer123` | **VIEWER** | `VIEW_AGGREGATES` |

> 💡 **Tip**: You can switch between active sessions directly in the UI header using the interactive **Switch Role/User** dropdown.

---

## 🔑 Environment Variables & AI Provider Keys

Copy `.env.example` to `.env` if custom keys are needed:

```bash
cp .env.example .env
```

### AI LLM Provider Configuration (`.env`)

The application supports **Google Gemini**, **Anthropic Claude**, and **OpenAI ChatGPT**. Configure one or more keys in your `.env` file:

```env
# Default Active AI Provider (Options: gemini | openai | claude)
AI_PROVIDER=gemini

# 1. Google Gemini API Key & Model Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# 2. OpenAI ChatGPT API Key & Model Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# 3. Anthropic Claude API Key & Model Configuration
CLAUDE_API_KEY=your_claude_api_key_here
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

---

## 🚀 Key Features

* **Instant One-Command Local Environment**: Zero manual database setup, data importing, or manual dependency installation.
* **Natural Language AI Financial Querying**: Ask natural language financial questions (e.g., *"What is the total transaction volume in Lagos by channel?"*).
* **Multi-LLM Engine**: Seamlessly switch between **Google Gemini**, **Anthropic Claude**, and **OpenAI ChatGPT** with automatic fallback.
* **Zero-Trust Server-Side RBAC**: AI is never the authorization boundary. The NestJS backend enforces strict role-based capability validation and field masking (Viewer, Analyst, Admin) before any SQL is generated or executed.
* **High-Speed Parquet Bulk Import**: Dual-engine pipeline using static **DuckDB CLI** and **PostgreSQL COPY streams** to ingest 5 Million rows in seconds.
* **User Management & Role Switching**: Interactive admin dashboard for managing user roles, creating accounts, and switching active sessions for live testing.

---

## 🛠️ Technology Stack

| Layer | Technology / Library |
| :--- | :--- |
| **Backend Framework** | [NestJS](https://nestjs.com/) (TypeScript, Express) |
| **Frontend Framework** | [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) + TypeScript |
| **Styling & UI** | Vanilla CSS (Glassmorphism dark theme, dynamic animations) + [Lucide Icons](https://lucide.dev/) |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) |
| **ORM** | [Prisma ORM 5](https://www.prisma.io/) |
| **Data Engine** | [DuckDB CLI](https://duckdb.org/) + `pg-copy-streams` (High-throughput bulk COPY protocol) |
| **AI Providers** | `@google/genai` (Gemini), `@anthropic-ai/sdk` (Claude), `openai` (GPT-4o) |
| **Auth & Security** | Passport.js, Google OAuth 2.0, Express Sessions, bcryptjs |
| **Containerization** | Docker & Docker Compose |

---

## 📂 Project Structure

```text
ai-financial-insights/
├── backend/
│   ├── src/
│   │   ├── ai/                  # AI Query Planner, Multi-LLM Providers (Gemini, Claude, OpenAI)
│   │   ├── assistant/           # Assistant controller & grounded response formatting
│   │   ├── auth/                # Session auth, Google OAuth 2.0, session switching
│   │   ├── financial-data/      # Financial transaction queries & SQL Builder
│   │   ├── health/              # System & Database health check controllers
│   │   ├── permissions/         # Granular permission definitions
│   │   ├── policy/              # Server-side RBAC policy engine & capability mapping
│   │   ├── query-execution/     # Safe parameterized SQL builder & execution engine
│   │   ├── roles/               # Role definitions (Viewer, Analyst, Admin)
│   │   └── users/               # User management controller & service
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema (Users, Roles, Permissions, Transactions)
│   │   └── seed.ts              # Seed roles, permissions, and demo users
│   ├── scripts/
│   │   ├── download-dataset.ts  # Downloads Hugging Face 5M row Parquet file
│   │   ├── import-dataset.ts    # High-speed DuckDB + Postgres COPY ingestion pipeline
│   │   └── verify-dataset.ts    # Dataset verification test suite
│   ├── Dockerfile               # Debian-based image with static DuckDB CLI v1.1.3
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/          # Navigation, User Management, AI Query Assistant
│   │   ├── pages/               # HomePage, Admin Page, Login Page
│   │   ├── services/            # Axios API client
│   │   └── auth/                # AuthContext provider
│   ├── Dockerfile               # Vite React development build
│   └── package.json
├── data/
│   ├── raw/                     # Raw Parquet file storage (persisted across containers)
│   └── processed/               # Temp CSV streaming directory
├── docker-compose.yml           # Complete container orchestration
├── package.json                 # Monorepo command shortcuts
├── ARCHITECTURE.md              # Detailed System & Security Pipeline Architecture
└── README.md
```

---

## 🌐 Application URLs

| Component | URL | Description |
| :--- | :--- | :--- |
| **Frontend App** | [http://localhost:5173](http://localhost:5173) | Main React Web Application |
| **Backend REST API** | [http://localhost:3000/api](http://localhost:3000/api) | NestJS API Gateway |
| **Swagger API Docs** | [http://localhost:3000/api/docs](http://localhost:3000/api/docs) | Interactive Swagger Documentation |
| **Health Check** | [http://localhost:3000/api/health](http://localhost:3000/api/health) | API Status Check |
| **Database Health** | [http://localhost:3000/api/health/database](http://localhost:3000/api/health/database) | Database Connection Health |

---

## 🛡️ RBAC Policy Matrix & Sensitive Fields

The platform enforces strict field-level masking and query capability restrictions prior to database query execution:

* **Sensitive Entity Fields**: `transaction_id`, `account_id`, `customer_id`, `device_id`

| Role | Allowed Query Types | Field Access Level |
| :--- | :--- | :--- |
| **Viewer** | Aggregate metrics (`SUM`, `COUNT`, `AVG`, `MIN`, `MAX`) grouped by standard dimensions. | Restricted (Aggregates only, sensitive entity fields stripped/blocked) |
| **Analyst** | Aggregate metrics, Trend analysis over time (`DATE_TRUNC`), Comparisons. | Restricted (Grouped metrics only, no individual customer/account lookup) |
| **Admin** | Unrestricted queries, Entity lookup, Row listings (`get_rows`), User Management. | Full Unrestricted Access |

---

## 🧪 Verification & Testing Commands

```bash
# Run backend unit tests (64 passed)
npm --prefix backend test

# Verify dataset integrity and database row count
npm run dataset:verify

# Re-import dataset with database truncation
npm run dataset:reset

# View logs for specific containers
npm run logs:backend
npm run logs:frontend
npm run logs:postgres
```

---

## 📄 License

This project is open-source and available under the **UNLICENSED** / Educational License.
