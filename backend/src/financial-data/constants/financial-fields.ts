export const FINANCIAL_TABLE_NAME = 'financial_transactions';

export const ALL_FINANCIAL_FIELDS = [
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
] as const;

export type FinancialField = (typeof ALL_FINANCIAL_FIELDS)[number];

export const SENSITIVE_FIELDS: readonly FinancialField[] = [
  'transaction_id',
  'account_id',
  'customer_id',
  'device_id',
] as const;

export const ALLOWED_AGGREGATE_METRIC_FIELDS: readonly FinancialField[] = [
  'amount_ngn',
  'balance_before_ngn',
  'balance_after_ngn',
] as const;

export const ALLOWED_DIMENSION_FIELDS: readonly FinancialField[] = [
  'transaction_type',
  'channel',
  'merchant_category_code',
  'merchant_name',
  'location_lga',
  'location_state',
  'status',
  'fraud_flag',
  'timestamp',
] as const;

export const ALLOWED_OPERATIONS = [
  'aggregate',
  'trend',
  'comparison',
  'get_rows',
  'conversational',
] as const;
