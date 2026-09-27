import { ColumnConfig } from './query.types';

export const SOURCE_TABLE_NAME = 'financial_transactions';
export const MAX_ENTITY_ROWS = 100;
export const DEFAULT_ENTITY_ROWS = 50;

export const ALLOWED_COLUMNS: Record<string, ColumnConfig> = {
  transaction_id: { sensitive: false, entityLevel: true, type: 'string' },
  account_id: { sensitive: true, entityLevel: true, type: 'string' },
  customer_id: { sensitive: true, entityLevel: true, type: 'string' },
  timestamp: { sensitive: false, entityLevel: false, type: 'datetime' },
  amount_ngn: { sensitive: false, entityLevel: false, type: 'decimal' },
  balance_before_ngn: { sensitive: false, entityLevel: false, type: 'decimal' },
  balance_after_ngn: { sensitive: false, entityLevel: false, type: 'decimal' },
  transaction_type: { sensitive: false, entityLevel: false, type: 'string' },
  channel: { sensitive: false, entityLevel: false, type: 'string' },
  merchant_category_code: { sensitive: false, entityLevel: false, type: 'string' },
  merchant_name: { sensitive: false, entityLevel: false, type: 'string' },
  location_lga: { sensitive: false, entityLevel: false, type: 'string' },
  location_state: { sensitive: false, entityLevel: false, type: 'string' },
  device_id: { sensitive: true, entityLevel: true, type: 'string' },
  status: { sensitive: false, entityLevel: false, type: 'string' },
  fraud_flag: { sensitive: false, entityLevel: false, type: 'boolean' },
};

export const ALLOWED_AGGREGATE_FUNCTIONS = new Set(['count', 'sum', 'avg', 'min', 'max']);

export const ALLOWED_FILTER_OPERATORS = new Set([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'in',
]);

export const TIME_GRAINS: Record<string, string> = {
  day: `DATE_TRUNC('day', "timestamp")`,
  week: `DATE_TRUNC('week', "timestamp")`,
  month: `DATE_TRUNC('month', "timestamp")`,
  quarter: `DATE_TRUNC('quarter', "timestamp")`,
  year: `DATE_TRUNC('year', "timestamp")`,
};

export const FORBIDDEN_SQL_KEYWORDS = [
  'insert',
  'update',
  'delete',
  'drop',
  'alter',
  'truncate',
  'create',
  'grant',
  'revoke',
  'exec',
  'execute',
  'union',
  'pg_sleep',
  'copy',
  'information_schema',
  'pg_catalog',
];
