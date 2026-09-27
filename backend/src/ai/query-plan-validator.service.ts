import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { QueryPlan, QueryOperation, QueryMetric } from './dto/query-plan.dto';
import {
  ALL_FINANCIAL_FIELDS,
  ALLOWED_OPERATIONS,
} from '../financial-data/constants/financial-fields';

@Injectable()
export class QueryPlanValidator {
  private readonly logger = new Logger(QueryPlanValidator.name);

  private readonly ALLOWED_OPERATIONS = ALLOWED_OPERATIONS as readonly string[];

  private readonly ALLOWED_METRICS: QueryMetric[] = [
    'sum',
    'avg',
    'count',
    'min',
    'max',
  ];

  private readonly ALLOWED_FIELDS = new Set<string>(ALL_FINANCIAL_FIELDS);

  private readonly FORBIDDEN_KEYS = new Set([
    'sql',
    'rawsql',
    'query',
    'command',
    'exec',
    'script',
  ]);

  private readonly SQL_INJECTION_PATTERN = /\b(select|insert|update|delete|drop|alter|create|truncate|grant|revoke|union|exec)\b/i;

  validate(plan: any): QueryPlan {
    if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
      throw new UnprocessableEntityException('Generated QueryPlan must be an object.');
    }

    // 1. Check for forbidden keys anywhere in the plan object
    this.checkForbiddenKeys(plan);

    // 2. Validate operation
    if (!plan.operation || !this.ALLOWED_OPERATIONS.includes(plan.operation)) {
      throw new UnprocessableEntityException(
        `Invalid query operation: [${plan.operation}]. Allowed: ${this.ALLOWED_OPERATIONS.join(', ')}`,
      );
    }

    // 3. Validate metric if present
    if (plan.metric && !this.ALLOWED_METRICS.includes(plan.metric)) {
      throw new UnprocessableEntityException(
        `Invalid query metric: [${plan.metric}]. Allowed: ${this.ALLOWED_METRICS.join(', ')}`,
      );
    }

    // 4. Validate metricField if present
    if (plan.metricField) {
      if (typeof plan.metricField === 'string') {
        plan.metricField = this.sanitizeFieldName(plan.metricField);
      }
      if (typeof plan.metricField !== 'string' || !this.ALLOWED_FIELDS.has(plan.metricField)) {
        throw new UnprocessableEntityException(
          `Invalid or unknown metricField: [${plan.metricField}]. Allowed fields: ${Array.from(this.ALLOWED_FIELDS).join(', ')}`,
        );
      }
      this.assertNoSqlInjection(plan.metricField);
    } else if (['aggregate', 'trend', 'comparison'].includes(plan.operation)) {
      plan.metricField = 'amount_ngn';
    }

    // 5. Validate dimensions if present
    if (plan.dimensions) {
      if (!Array.isArray(plan.dimensions)) {
        throw new UnprocessableEntityException('dimensions must be an array of string field names.');
      }
      plan.dimensions = plan.dimensions.map((dim: any) =>
        typeof dim === 'string' ? this.sanitizeFieldName(dim) : dim,
      );
      for (const dim of plan.dimensions) {
        if (typeof dim !== 'string' || !this.ALLOWED_FIELDS.has(dim)) {
          throw new UnprocessableEntityException(
            `Invalid or unknown dimension field: [${dim}]. Allowed fields: ${Array.from(this.ALLOWED_FIELDS).join(', ')}`,
          );
        }
        this.assertNoSqlInjection(dim);
      }
    }

    // 6. Validate & Normalize filters
    if (plan.filters) {
      if (Array.isArray(plan.filters)) {
        const objFilters: Record<string, any> = {};
        for (const item of plan.filters) {
          if (typeof item === 'object' && item !== null) {
            const k = item.field || item.key || item.name;
            const v = item.value !== undefined ? item.value : item.val;
            if (k && v !== undefined) {
              objFilters[String(k)] = v;
            }
          } else if (typeof item === 'string' && item.includes('=')) {
            const [k, v] = item.split('=');
            if (k && v) {
              objFilters[k.trim()] = v.trim();
            }
          }
        }
        plan.filters = objFilters;
      } else if (typeof plan.filters !== 'object' || plan.filters === null) {
        throw new UnprocessableEntityException('filters must be a key-value object.');
      }

      const sanitizedFilters: Record<string, any> = {};
      for (const [key, value] of Object.entries(plan.filters)) {
        const sanitizedKey = this.sanitizeFieldName(key);
        if (!this.ALLOWED_FIELDS.has(sanitizedKey)) {
          throw new UnprocessableEntityException(
            `Invalid filter field: [${sanitizedKey}]. Allowed fields: ${Array.from(this.ALLOWED_FIELDS).join(', ')}`,
          );
        }
        if (typeof value === 'string') {
          this.assertNoSqlInjection(value);
        }
        sanitizedFilters[sanitizedKey] = value;
      }
      plan.filters = sanitizedFilters;
    } else {
      plan.filters = {};
    }

    // 7. Validate dateRange if present
    if (plan.dateRange) {
      if (typeof plan.dateRange !== 'object' || Array.isArray(plan.dateRange)) {
        throw new UnprocessableEntityException('dateRange must be an object.');
      }
      if (plan.dateRange.from && typeof plan.dateRange.from === 'string') {
        this.assertNoSqlInjection(plan.dateRange.from);
      }
      if (plan.dateRange.to && typeof plan.dateRange.to === 'string') {
        this.assertNoSqlInjection(plan.dateRange.to);
      }
    }

    // 8. Validate explanation
    if (!plan.explanation || typeof plan.explanation !== 'string') {
      throw new UnprocessableEntityException('QueryPlan must contain a valid string explanation.');
    }
    this.assertNoSqlInjection(plan.explanation);

    return plan as QueryPlan;
  }

  private sanitizeFieldName(field: string): string {
    if (!field || typeof field !== 'string') return field;
    const trimmed = field.trim();
    if (this.ALLOWED_FIELDS.has(trimmed)) return trimmed;

    const lower = trimmed.toLowerCase();
    if (['amount', 'expense', 'expenses', 'revenue', 'spending', 'total_amount', 'value', 'price', 'cost'].includes(lower)) {
      return 'amount_ngn';
    }
    if (['type', 'category', 'trans_type', 'transactiontype'].includes(lower)) {
      return 'transaction_type';
    }
    if (['balance', 'account_balance'].includes(lower)) {
      return 'balance_after_ngn';
    }
    if (['lga', 'city', 'location'].includes(lower)) {
      return 'location_lga';
    }
    if (['state', 'region'].includes(lower)) {
      return 'location_state';
    }
    if (['date', 'time', 'day', 'month', 'year'].includes(lower)) {
      return 'timestamp';
    }

    for (const allowed of ALL_FINANCIAL_FIELDS) {
      if (trimmed.includes(allowed)) {
        return allowed;
      }
    }
    return trimmed;
  }

  private checkForbiddenKeys(obj: any): void {
    if (!obj || typeof obj !== 'object') return;

    const keys = Object.keys(obj);
    for (const key of keys) {
      if (this.FORBIDDEN_KEYS.has(key.toLowerCase())) {
        throw new UnprocessableEntityException(`Forbidden key detected in QueryPlan: [${key}]`);
      }
      if (obj[key] && typeof obj[key] === 'object') {
        this.checkForbiddenKeys(obj[key]);
      }
    }
  }

  private assertNoSqlInjection(val: string): void {
    if (this.SQL_INJECTION_PATTERN.test(val)) {
      throw new UnprocessableEntityException(`Potential SQL injection keyword detected in string: "${val}"`);
    }
  }
}
