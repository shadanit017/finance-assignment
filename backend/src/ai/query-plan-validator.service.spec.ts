import { UnprocessableEntityException } from '@nestjs/common';
import { QueryPlanValidator } from './query-plan-validator.service';

describe('QueryPlanValidator', () => {
  let validator: QueryPlanValidator;

  beforeEach(() => {
    validator = new QueryPlanValidator();
  });

  it('should validate a valid aggregate plan', () => {
    const plan = {
      operation: 'aggregate',
      metric: 'sum',
      metricField: 'amount_ngn',
      dimensions: ['transaction_type'],
      filters: { location_state: 'Lagos' },
      dateRange: { from: '2024-01-01', to: '2024-12-31' },
      explanation: 'Calculate total transaction amount for Lagos in 2024 grouped by transaction type.',
    };

    const result = validator.validate(plan);
    expect(result).toEqual(plan);
  });

  it('should validate a valid trend plan', () => {
    const plan = {
      operation: 'trend',
      metric: 'avg',
      metricField: 'amount_ngn',
      dimensions: ['timestamp'],
      explanation: 'Monthly average transaction amount trend.',
    };

    const result = validator.validate(plan);
    expect(result.operation).toBe('trend');
  });

  it('should validate a valid comparison plan', () => {
    const plan = {
      operation: 'comparison',
      metric: 'count',
      dimensions: ['channel'],
      explanation: 'Compare transaction counts by channel.',
    };

    const result = validator.validate(plan);
    expect(result.operation).toBe('comparison');
  });

  it('should validate a valid get_rows plan', () => {
    const plan = {
      operation: 'get_rows',
      limit: 50,
      filters: { customer_id: 'cust_123' },
      explanation: 'Retrieve line-item transactions for customer cust_123.',
    };

    const result = validator.validate(plan);
    expect(result.operation).toBe('get_rows');
  });

  it('should reject an invalid operation', () => {
    const plan = {
      operation: 'invalid_op',
      explanation: 'Invalid test operation.',
    };

    expect(() => validator.validate(plan)).toThrow(UnprocessableEntityException);
  });

  it('should reject an invalid metric', () => {
    const plan = {
      operation: 'aggregate',
      metric: 'invalid_metric',
      metricField: 'amount_ngn',
      explanation: 'Invalid metric test.',
    };

    expect(() => validator.validate(plan)).toThrow(UnprocessableEntityException);
  });

  it('should reject unknown fields in metricField, dimensions, or filters', () => {
    const planWithUnknownMetric = {
      operation: 'aggregate',
      metric: 'sum',
      metricField: 'secret_bank_account_password',
      explanation: 'Unknown field test.',
    };
    expect(() => validator.validate(planWithUnknownMetric)).toThrow(UnprocessableEntityException);

    const planWithUnknownDim = {
      operation: 'aggregate',
      metric: 'sum',
      dimensions: ['unknown_column'],
      explanation: 'Unknown dimension test.',
    };
    expect(() => validator.validate(planWithUnknownDim)).toThrow(UnprocessableEntityException);

    const planWithUnknownFilter = {
      operation: 'aggregate',
      metric: 'sum',
      filters: { non_existent_column: 'value' },
      explanation: 'Unknown filter test.',
    };
    expect(() => validator.validate(planWithUnknownFilter)).toThrow(UnprocessableEntityException);
  });

  it('should reject forbidden keys such as sql or rawSql', () => {
    const planWithSqlKey = {
      operation: 'aggregate',
      sql: 'SELECT * FROM users',
      explanation: 'Forbidden sql key test.',
    };

    expect(() => validator.validate(planWithSqlKey)).toThrow(UnprocessableEntityException);
  });

  it('should reject SQL injection keywords inside string values', () => {
    const planWithSqlInjected = {
      operation: 'aggregate',
      explanation: 'DROP TABLE users CASCADE;',
    };

    expect(() => validator.validate(planWithSqlInjected)).toThrow(UnprocessableEntityException);
  });
});
