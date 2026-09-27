import { Injectable, BadRequestException } from '@nestjs/common';
import { QueryPlan } from '../ai/dto/query-plan.dto';
import { BuiltQuery, QueryOperation } from './query.types';
import {
  ALLOWED_COLUMNS,
  ALLOWED_AGGREGATE_FUNCTIONS,
  SOURCE_TABLE_NAME,
  MAX_ENTITY_ROWS,
  DEFAULT_ENTITY_ROWS,
  TIME_GRAINS,
} from './query.constants';

@Injectable()
export class SqlBuilderService {
  /**
   * Main entrypoint to build safe parameterized SQL from a validated QueryPlan.
   * Accepts optional allowedFields list from authorization check.
   */
  buildSql(plan: QueryPlan, allowedFields?: string[]): BuiltQuery {
    switch (plan.operation) {
      case QueryOperation.AGGREGATE:
        return this.buildAggregateQuery(plan);

      case QueryOperation.TREND:
        return this.buildTrendQuery(plan);

      case QueryOperation.COMPARISON:
        return this.buildComparisonQuery(plan);

      case QueryOperation.GET_ROWS:
        return this.buildRowsQuery(plan, allowedFields);

      default:
        return this.buildAggregateQuery(plan);
    }
  }

  /**
   * Build aggregate SQL query (e.g., SUM, COUNT, AVG across dimensions).
   */
  buildAggregateQuery(plan: QueryPlan): BuiltQuery {
    const params: unknown[] = [];
    const whereClauses: string[] = [];

    this.processFilters(plan, params, whereClauses);

    const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';
    const metric = this.sanitizeAggregate(plan.metric || 'sum');
    const metricField = this.sanitizeColumn(plan.metricField || 'amount_ngn');

    if (plan.dimensions && plan.dimensions.length > 0) {
      const dimensions = plan.dimensions.map((d) => `"${this.sanitizeColumn(d)}"`);
      const groupSql = ` GROUP BY ${dimensions.join(', ')}`;
      const orderSql = ` ORDER BY value DESC`;
      const limitVal = this.getSafeLimit(plan.limit);

      const query = `SELECT ${dimensions.join(', ')}, ${metric}("${metricField}")::numeric AS value, COUNT(*)::bigint AS count FROM "${SOURCE_TABLE_NAME}"${whereSql}${groupSql}${orderSql} LIMIT ${limitVal};`;
      const displaySql = this.formatDisplaySql(query, params);

      return { query, params, displaySql };
    }

    const query = `SELECT ${metric}("${metricField}")::numeric AS value, COUNT(*)::bigint AS count FROM "${SOURCE_TABLE_NAME}"${whereSql};`;
    const displaySql = this.formatDisplaySql(query, params);

    return { query, params, displaySql };
  }

  /**
   * Build trend SQL query grouped by time period (day, week, month, quarter, year).
   */
  buildTrendQuery(plan: QueryPlan): BuiltQuery {
    const params: unknown[] = [];
    const whereClauses: string[] = [];

    this.processFilters(plan, params, whereClauses);

    const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';
    const metric = this.sanitizeAggregate(plan.metric || 'sum');
    const metricField = this.sanitizeColumn(plan.metricField || 'amount_ngn');
    const timeGrainExpr = TIME_GRAINS['month']; // default monthly trend

    const query = `SELECT ${timeGrainExpr} AS period, ${metric}("${metricField}")::numeric AS value, COUNT(*)::bigint AS count FROM "${SOURCE_TABLE_NAME}"${whereSql} GROUP BY period ORDER BY period ASC;`;
    const displaySql = this.formatDisplaySql(query, params);

    return { query, params, displaySql };
  }

  /**
   * Build comparison SQL query comparing metric values across categorical dimensions.
   */
  buildComparisonQuery(plan: QueryPlan): BuiltQuery {
    const params: unknown[] = [];
    const whereClauses: string[] = [];

    this.processFilters(plan, params, whereClauses);

    const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';
    const metric = this.sanitizeAggregate(plan.metric || 'sum');
    const metricField = this.sanitizeColumn(plan.metricField || 'amount_ngn');
    const dimensions =
      plan.dimensions && plan.dimensions.length > 0
        ? plan.dimensions.map((d) => `"${this.sanitizeColumn(d)}"`)
        : ['"channel"'];
    const limitVal = this.getSafeLimit(plan.limit);

    const query = `SELECT ${dimensions.join(', ')}, ${metric}("${metricField}")::numeric AS value, COUNT(*)::bigint AS count FROM "${SOURCE_TABLE_NAME}"${whereSql} GROUP BY ${dimensions.join(', ')} ORDER BY value DESC LIMIT ${limitVal};`;
    const displaySql = this.formatDisplaySql(query, params);

    return { query, params, displaySql };
  }

  /**
   * Build entity rows SQL query. Never uses SELECT *; explicitly selects allowed columns only.
   */
  buildRowsQuery(plan: QueryPlan, allowedFields?: string[]): BuiltQuery {
    const params: unknown[] = [];
    const whereClauses: string[] = [];

    this.processFilters(plan, params, whereClauses);

    const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';

    // Project explicit approved columns (never SELECT *)
    let targetColumns: string[] = [];
    if (allowedFields && allowedFields.length > 0) {
      targetColumns = allowedFields.map((f) => this.sanitizeColumn(f));
    } else {
      // Default approved column projection
      targetColumns = Object.keys(ALLOWED_COLUMNS).filter(
        (col) => !ALLOWED_COLUMNS[col].sensitive || col === 'customer_id' || col === 'account_id',
      );
    }

    const projectedCols = targetColumns.map((c) => `"${c}"`).join(', ');
    const safeLimit = this.getSafeLimit(plan.limit);

    const query = `SELECT ${projectedCols} FROM "${SOURCE_TABLE_NAME}"${whereSql} ORDER BY "timestamp" DESC LIMIT ${safeLimit};`;
    const displaySql = this.formatDisplaySql(query, params);

    return { query, params, displaySql };
  }

  /**
   * Process and parameterize filters from dateRange and filters key.
   */
  private processFilters(plan: QueryPlan, params: unknown[], whereClauses: string[]): void {
    if (plan.dateRange) {
      if (plan.dateRange.from) {
        const fromDate = this.parseStartDate(plan.dateRange.from);
        params.push(fromDate);
        whereClauses.push(`"timestamp" >= $${params.length}::timestamptz`);
      }
      if (plan.dateRange.to) {
        const toDate = this.parseEndDate(plan.dateRange.to);
        params.push(toDate);
        whereClauses.push(`"timestamp" <= $${params.length}::timestamptz`);
      }
    }

    if (plan.filters && typeof plan.filters === 'object') {
      for (const [col, val] of Object.entries(plan.filters)) {
        if (val === undefined || val === null || val === '') continue;

        const safeCol = this.sanitizeColumn(col);

        if (Array.isArray(val)) {
          if (val.length === 0) continue;
          const placeholders = val.map((v) => {
            params.push(v);
            return `$${params.length}`;
          });
          whereClauses.push(`"${safeCol}" IN (${placeholders.join(', ')})`);
        } else if (typeof val === 'boolean') {
          params.push(val);
          whereClauses.push(`"${safeCol}" = $${params.length}`);
        } else if (safeCol === 'timestamp') {
          const strVal = String(val).trim();
          if (/^\d{4}$/.test(strVal)) {
            const yearNum = parseInt(strVal, 10);
            const startYear = new Date(Date.UTC(yearNum, 0, 1, 0, 0, 0));
            const endYear = new Date(Date.UTC(yearNum + 1, 0, 1, 0, 0, 0));
            params.push(startYear);
            const startIdx = params.length;
            params.push(endYear);
            const endIdx = params.length;
            whereClauses.push(`"timestamp" >= $${startIdx}::timestamptz AND "timestamp" < $${endIdx}::timestamptz`);
          } else if (/^\d{4}-\d{2}$/.test(strVal)) {
            const [y, m] = strVal.split('-').map(Number);
            const startMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
            const endMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0));
            params.push(startMonth);
            const startIdx = params.length;
            params.push(endMonth);
            const endIdx = params.length;
            whereClauses.push(`"timestamp" >= $${startIdx}::timestamptz AND "timestamp" < $${endIdx}::timestamptz`);
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) {
            params.push(strVal);
            whereClauses.push(`"timestamp"::date = $${params.length}::date`);
          } else {
            params.push(strVal);
            whereClauses.push(`"timestamp" = $${params.length}::timestamptz`);
          }
        } else {
          params.push(val);
          whereClauses.push(`"${safeCol}" = $${params.length}`);
        }
      }
    }
  }

  private parseStartDate(dateStr: string): Date {
    const trimmed = dateStr.trim();
    if (/^\d{4}$/.test(trimmed)) {
      return new Date(Date.UTC(parseInt(trimmed, 10), 0, 1, 0, 0, 0));
    }
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      const [y, m] = trimmed.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    }
    return new Date(trimmed);
  }

  private parseEndDate(dateStr: string): Date {
    const trimmed = dateStr.trim();
    if (/^\d{4}$/.test(trimmed)) {
      return new Date(Date.UTC(parseInt(trimmed, 10), 11, 31, 23, 59, 59, 999));
    }
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      const [y, m] = trimmed.split('-').map(Number);
      return new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
    }
    return new Date(trimmed);
  }

  /**
   * Sanitizes column identifier against allowed dataset columns.
   */
  private sanitizeColumn(colName: string): string {
    const lower = colName.toLowerCase();
    if (!ALLOWED_COLUMNS[lower]) {
      throw new BadRequestException(`Invalid or disallowed dataset column: [${colName}]`);
    }
    return lower;
  }

  /**
   * Sanitizes aggregate function against allowed functions list.
   */
  private sanitizeAggregate(metric: string): string {
    const lower = metric.toLowerCase();
    if (!ALLOWED_AGGREGATE_FUNCTIONS.has(lower)) {
      throw new BadRequestException(`Invalid or disallowed aggregate function: [${metric}]`);
    }
    return lower.toUpperCase();
  }

  /**
   * Enforces mandatory maximum limit for row queries (capped at MAX_ENTITY_ROWS = 100).
   */
  private getSafeLimit(requestedLimit?: number): number {
    if (!requestedLimit || requestedLimit <= 0) {
      return DEFAULT_ENTITY_ROWS; // 50
    }
    return Math.min(requestedLimit, MAX_ENTITY_ROWS); // capped at 100
  }

  /**
   * Generates display SQL string with parameter values formatted for logging/evidence.
   */
  private formatDisplaySql(query: string, params: unknown[]): string {
    let display = query;
    params.forEach((param, index) => {
      const valStr = typeof param === 'string' ? `'${param}'` : String(param);
      display = display.replace(new RegExp(`\\$${index + 1}\\b`, 'g'), valStr);
    });
    return display;
  }
}
