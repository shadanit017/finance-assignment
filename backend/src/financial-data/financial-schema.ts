import {
  ALL_FINANCIAL_FIELDS,
  SENSITIVE_FIELDS,
  ALLOWED_AGGREGATE_METRIC_FIELDS,
  ALLOWED_DIMENSION_FIELDS,
  ALLOWED_OPERATIONS,
  FinancialField,
} from './constants/financial-fields';

export interface ColumnMetadata {
  name: FinancialField;
  type: string;
  isSensitive: boolean;
  allowAggregate: boolean;
  allowDimension: boolean;
  description: string;
}

export class FinancialSchemaRegistry {
  private static readonly COLUMNS: ColumnMetadata[] = [
    {
      name: 'transaction_id',
      type: 'string',
      isSensitive: true,
      allowAggregate: false,
      allowDimension: false,
      description: 'Unique synthetic transaction identifier.',
    },
    {
      name: 'account_id',
      type: 'string',
      isSensitive: true,
      allowAggregate: false,
      allowDimension: false,
      description: 'Synthetic bank account identifier.',
    },
    {
      name: 'customer_id',
      type: 'string',
      isSensitive: true,
      allowAggregate: false,
      allowDimension: false,
      description: 'Synthetic customer identifier.',
    },
    {
      name: 'timestamp',
      type: 'datetime',
      isSensitive: false,
      allowAggregate: false,
      allowDimension: true,
      description: 'Transaction ISO timestamp.',
    },
    {
      name: 'amount_ngn',
      type: 'decimal',
      isSensitive: false,
      allowAggregate: true,
      allowDimension: false,
      description: 'Transaction amount in NGN currency.',
    },
    {
      name: 'balance_before_ngn',
      type: 'decimal',
      isSensitive: false,
      allowAggregate: true,
      allowDimension: false,
      description: 'Account balance prior to transaction.',
    },
    {
      name: 'balance_after_ngn',
      type: 'decimal',
      isSensitive: false,
      allowAggregate: true,
      allowDimension: false,
      description: 'Account balance after transaction.',
    },
    {
      name: 'transaction_type',
      type: 'string',
      isSensitive: false,
      allowAggregate: false,
      allowDimension: true,
      description: 'Type of transaction (TRANSFER, WITHDRAWAL, DEPOSIT, PAYMENT, etc.).',
    },
    {
      name: 'channel',
      type: 'string',
      isSensitive: false,
      allowAggregate: false,
      allowDimension: true,
      description: 'Channel used (ATM, MOBILE, WEB, POS, BRANCH, etc.).',
    },
    {
      name: 'merchant_category_code',
      type: 'string',
      isSensitive: false,
      allowAggregate: false,
      allowDimension: true,
      description: 'MCC classification code.',
    },
    {
      name: 'merchant_name',
      type: 'string',
      isSensitive: false,
      allowAggregate: false,
      allowDimension: true,
      description: 'Merchant or payee name.',
    },
    {
      name: 'location_lga',
      type: 'string',
      isSensitive: false,
      allowAggregate: false,
      allowDimension: true,
      description: 'Nigerian Local Government Area.',
    },
    {
      name: 'location_state',
      type: 'string',
      isSensitive: false,
      allowAggregate: false,
      allowDimension: true,
      description: 'Nigerian State or FCT.',
    },
    {
      name: 'device_id',
      type: 'string',
      isSensitive: true,
      allowAggregate: false,
      allowDimension: false,
      description: 'Synthetic device identifier.',
    },
    {
      name: 'status',
      type: 'string',
      isSensitive: false,
      allowAggregate: false,
      allowDimension: true,
      description: 'Transaction status (SUCCESS, FAILED, PENDING, etc.).',
    },
    {
      name: 'fraud_flag',
      type: 'boolean',
      isSensitive: false,
      allowAggregate: false,
      allowDimension: true,
      description: 'Synthetic fraud detection flag.',
    },
  ];

  static getAllFields() {
    return ALL_FINANCIAL_FIELDS;
  }

  static getSensitiveFields() {
    return SENSITIVE_FIELDS;
  }

  static getAllowedAggregateFields() {
    return ALLOWED_AGGREGATE_METRIC_FIELDS;
  }

  static getAllowedDimensionFields() {
    return ALLOWED_DIMENSION_FIELDS;
  }

  static getAllowedOperations() {
    return ALLOWED_OPERATIONS;
  }

  static getColumnMetadata(field: string): ColumnMetadata | undefined {
    return this.COLUMNS.find((c) => c.name === field);
  }

  static isSensitive(field: string): boolean {
    return (SENSITIVE_FIELDS as readonly string[]).includes(field);
  }

  static isValidField(field: string): boolean {
    return (ALL_FINANCIAL_FIELDS as readonly string[]).includes(field);
  }
}
