import { Injectable, BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { QueryPlan } from '../../ai/dto/query-plan.dto';
import {
  ALLOWED_COLUMNS,
  ALLOWED_AGGREGATE_FUNCTIONS,
  FORBIDDEN_SQL_KEYWORDS,
} from '../query.constants';
import { QueryOperation } from '../query.types';

@Injectable()
export class QueryPlanExecutionValidator {
  private readonly ALLOWED_OPERATIONS = new Set<string>([
    QueryOperation.AGGREGATE,
    QueryOperation.TREND,
    QueryOperation.COMPARISON,
    QueryOperation.GET_ROWS,
  ]);

  validateForExecution(plan: QueryPlan): void {
    if (!plan || typeof plan !== 'object') {
      throw new UnprocessableEntityException('QueryPlan must be an object.');
    }

    // 1. Operation validation
    if (!plan.operation || !this.ALLOWED_OPERATIONS.has(plan.operation)) {
      throw new UnprocessableEntityException(
        `Invalid query operation [${plan.operation}]. Allowed operations: aggregate, trend, comparison, get_rows.`,
      );
    }

    // 2. Aggregate function validation
    if (plan.metric) {
      const metricLower = plan.metric.toLowerCase();
      if (!ALLOWED_AGGREGATE_FUNCTIONS.has(metricLower)) {
        throw new UnprocessableEntityException(
          `Disallowed aggregate function [${plan.metric}]. Allowed: ${Array.from(
            ALLOWED_AGGREGATE_FUNCTIONS,
          ).join(', ')}`,
        );
      }
    }

    // 3. Metric field validation
    if (plan.metricField) {
      this.validateColumnName(plan.metricField);
    }

    // 4. Dimensions validation
    if (plan.dimensions) {
      if (!Array.isArray(plan.dimensions)) {
        throw new UnprocessableEntityException('dimensions must be an array of field names.');
      }
      for (const dim of plan.dimensions) {
        this.validateColumnName(dim);
      }
    }

    // 5. Filters validation
    if (plan.filters && typeof plan.filters === 'object') {
      for (const [col, val] of Object.entries(plan.filters)) {
        this.validateColumnName(col);
        if (typeof val === 'string') {
          this.assertNoSqlKeywords(val);
        }
      }
    }

    // 6. DateRange validation
    if (plan.dateRange) {
      if (plan.dateRange.from) this.assertNoSqlKeywords(plan.dateRange.from);
      if (plan.dateRange.to) this.assertNoSqlKeywords(plan.dateRange.to);
    }

    // 7. Prevent Unbounded Entity Queries (get_rows without filters)
    if (plan.operation === QueryOperation.GET_ROWS) {
      const hasFilter =
        (plan.filters && Object.keys(plan.filters).length > 0) ||
        (plan.dateRange && (plan.dateRange.from || plan.dateRange.to)) ||
        (plan.dimensions && plan.dimensions.length > 0);

      if (!hasFilter) {
        throw new BadRequestException(
          'This request would return too many records. Please provide a filter such as customer, account, date range, state, or transaction type.',
        );
      }
    }

    // 8. Explanation inspection
    if (plan.explanation) {
      this.assertNoSqlKeywords(plan.explanation);
    }
  }

  private validateColumnName(colName: string): void {
    if (!colName || typeof colName !== 'string') {
      throw new BadRequestException('Column name must be a non-empty string.');
    }

    const lowerCol = colName.toLowerCase();
    if (!ALLOWED_COLUMNS[lowerCol]) {
      throw new BadRequestException(
        `Invalid or unapproved dataset column: [${colName}]. Allowed columns: ${Object.keys(
          ALLOWED_COLUMNS,
        ).join(', ')}`,
      );
    }

    this.assertNoSqlKeywords(colName);
  }

  private assertNoSqlKeywords(inputStr: string): void {
    const lowerInput = inputStr.toLowerCase();
    for (const keyword of FORBIDDEN_SQL_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(lowerInput)) {
        throw new BadRequestException(
          `Forbidden SQL keyword or command detected in input: "${keyword}"`,
        );
      }
    }
  }
}
