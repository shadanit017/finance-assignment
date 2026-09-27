import { BadRequestException } from '@nestjs/common';
import { FinancialSqlBuilderService } from './financial-sql-builder.service';
import { QueryPlan } from '../ai/dto/query-plan.dto';

describe('FinancialSqlBuilderService', () => {
  let sqlBuilder: FinancialSqlBuilderService;

  beforeEach(() => {
    sqlBuilder = new FinancialSqlBuilderService();
  });

  it('should generate valid parameterized SQL for aggregate query', () => {
    const plan: QueryPlan = {
      operation: 'aggregate',
      metric: 'sum',
      metricField: 'amount_ngn',
      dateRange: { from: '2024-01-01', to: '2024-12-31' },
      explanation: 'Calculate total transaction volume for 2024',
    };

    const { sql, params } = sqlBuilder.buildSql(plan);
    expect(sql).toContain('SELECT SUM("amount_ngn")::numeric AS value');
    expect(sql).toContain('FROM "financial_transactions"');
    expect(sql).toContain('WHERE "timestamp" >= $1 AND "timestamp" <= $2');
    expect(params.length).toBe(2);
  });

  it('should generate valid parameterized SQL for segmentation query', () => {
    const plan: QueryPlan = {
      operation: 'segmentation',
      metric: 'sum',
      metricField: 'amount_ngn',
      dimensions: ['location_state'],
      filters: { channel: 'Web' },
      explanation: 'Total transactions by state for Web channel',
    };

    const { sql, params } = sqlBuilder.buildSql(plan);
    expect(sql).toContain('SELECT "location_state", SUM("amount_ngn")::numeric AS value');
    expect(sql).toContain('WHERE "channel" = $1');
    expect(sql).toContain('GROUP BY "location_state"');
    expect(params).toEqual(['Web']);
  });

  it('should throw BadRequestException if invalid/malicious column name is passed', () => {
    const plan: QueryPlan = {
      operation: 'aggregate',
      metric: 'sum',
      metricField: 'amount_ngn; DROP TABLE users;--',
      explanation: 'SQL injection attempt',
    };

    expect(() => sqlBuilder.buildSql(plan)).toThrow(BadRequestException);
  });
});
