import { Schema, Type } from '@google/genai';

export const QUERY_PLAN_GEMINI_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    operation: {
      type: Type.STRING,
      enum: ['aggregate', 'trend', 'comparison', 'get_rows', 'conversational'],
      description: 'The operation type to perform: aggregate, trend, comparison, get_rows, or conversational for general chat/greetings.',
    },
    metric: {
      type: Type.STRING,
      enum: ['sum', 'avg', 'count', 'min', 'max'],
      description: 'Aggregation metric if applicable (sum, avg, count, min, max).',
    },
    metricField: {
      type: Type.STRING,
      enum: [
        'transaction_id',
        'account_id',
        'customer_id',
        'timestamp',
        'amount_ngn',
        'balance_before_ngn',
        'balance_after_ngn',
        'transaction_type',
        'channel',
        'merchant_category_code',
        'merchant_name',
        'location_lga',
        'location_state',
        'device_id',
        'status',
        'fraud_flag',
      ],
      description: 'The target field name for aggregation metric (must be an exact allowed field name like amount_ngn).',
    },
    dimensions: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        enum: [
          'transaction_id',
          'account_id',
          'customer_id',
          'timestamp',
          'amount_ngn',
          'balance_before_ngn',
          'balance_after_ngn',
          'transaction_type',
          'channel',
          'merchant_category_code',
          'merchant_name',
          'location_lga',
          'location_state',
          'device_id',
          'status',
          'fraud_flag',
        ],
      },
      description: 'Fields to group or segment data by.',
    },
    filters: {
      type: Type.OBJECT,
      description: 'Key-value string pairs representing filtering criteria.',
    },
    dateRange: {
      type: Type.OBJECT,
      properties: {
        from: { type: Type.STRING, description: 'ISO date YYYY-MM-DD start date.' },
        to: { type: Type.STRING, description: 'ISO date YYYY-MM-DD end date.' },
      },
      description: 'Date range filter bounds.',
    },
    limit: {
      type: Type.INTEGER,
      description: 'Maximum rows to return if operation is get_rows.',
    },
    explanation: {
      type: Type.STRING,
      description: 'Concise explanation or conversational response to the user question.',
    },
  },
  required: ['operation', 'explanation'],
};

export const FINANCIAL_SYSTEM_INSTRUCTION = `
You are a financial analytics assistant. Convert the user's natural language question into a structured QueryPlan JSON object according to the provided JSON schema.

Available financial data context:
Table: financial_transactions

Allowed fields:
- transaction_id (string, unique ID)
- account_id (string, account ID)
- customer_id (string, customer ID)
- timestamp (datetime, YYYY-MM-DD)
- amount_ngn (decimal, transaction amount in NGN - use for expenses, revenue, payments, withdrawals, total amount)
- balance_before_ngn (decimal, account balance before transaction)
- balance_after_ngn (decimal, account balance after transaction)
- transaction_type (string, e.g. TRANSFER, WITHDRAWAL, DEPOSIT, PAYMENT)
- channel (string, e.g. ATM, MOBILE, WEB, POS, BRANCH)
- merchant_category_code (string, MCC code)
- merchant_name (string, merchant name)
- location_lga (string, Nigerian Local Government Area)
- location_state (string, Nigerian State or FCT)
- device_id (string, synthetic device identifier)
- status (string, e.g. SUCCESS, FAILED, PENDING)
- fraud_flag (boolean, true if flagged as fraud)

Allowed operations:
- aggregate: For calculating totals, averages, counts, minimums, maximums (e.g., "total transaction amount", "average expense").
- trend: For analyzing metrics over time (e.g., "monthly trend", "amount over time").
- comparison: For comparing metrics across dimensions or periods (e.g., "compare by channel", "compare by state").
- get_rows: For retrieving granular line-item transaction rows.
- conversational: For greetings, polite small talk, general questions, or non-financial queries (e.g., "hello", "how are you", "who are you"). When operation is conversational, write a friendly response in explanation.

Rules:
1. Return ONLY a JSON object strictly matching the QueryPlan schema.
2. Do NOT output SQL, raw SQL queries, or commands under any circumstance.
3. For expenses, revenue, spending, or financial amounts, always set metricField to "amount_ngn".
4. "filters" MUST be a JSON object mapping allowed field names to string/boolean values (e.g., {"transaction_type": "WITHDRAWAL"}). If there are no filters, set filters to {}. NEVER return an array for filters.
5. Only reference exact allowed field names in metricField, dimensions, or filters.
6. Set operation to one of: aggregate, trend, comparison, get_rows, conversational.
`;
