import { Injectable, BadRequestException } from '@nestjs/common';
import { QueryPlan } from '../ai/dto/query-plan.dto';
import { FinancialSchemaRegistry } from './financial-schema';

export interface ParameterizedSql {
  sql: string;
  params: any[];
}

@Injectable()
export class FinancialSqlBuilderService {
  private readonly tableName = 'financial_transactions';

  /**
   * Sanitizes column identifier against allowed schema fields to prevent SQL injection.
   */
  private sanitizeColumn(colName: string): string {
    const validField = FinancialSchemaRegistry.isValidField(colName);
    if (!validField) {
      throw new BadRequestException(`Invalid or disallowed column name in query plan: [${colName}]`);
    }
    return colName;
  }

  /**
   * Builds safe parameterized SQL from a validated QueryPlan.
   */
  buildSql(plan: QueryPlan): ParameterizedSql {
    const params: any[] = [];
    const whereClauses: string[] = [];

    // Process dateRange filter
    if (plan.dateRange) {
      if (plan.dateRange.from) {
        params.push(new Date(plan.dateRange.from));
        whereClauses.push(`"timestamp" >= $${params.length}`);
      }
      if (plan.dateRange.to) {
        params.push(new Date(plan.dateRange.to));
        whereClauses.push(`"timestamp" <= $${params.length}`);
      }
    }

    // Process additional equality/IN filters
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
        } else {
          params.push(val);
          whereClauses.push(`"${safeCol}" = $${params.length}`);
        }
      }
    }

    const whereClause = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';
    const queryLimit = plan.limit && plan.limit > 0 && plan.limit <= 1000 ? plan.limit : 100;

    // Handle Operation Types
    switch (plan.operation) {
      case 'aggregate': {
        const metric = plan.metric ? plan.metric.toUpperCase() : 'SUM';
        const metricField = plan.metricField ? this.sanitizeColumn(plan.metricField) : 'amount_ngn';
        const sql = `SELECT ${metric}("${metricField}")::numeric AS value, COUNT(*)::bigint AS count FROM "${this.tableName}"${whereClause};`;
        return { sql, params };
      }

      case 'segmentation': {
        const dimensions = plan.dimensions && plan.dimensions.length > 0
          ? plan.dimensions.map((d) => `"${this.sanitizeColumn(d)}"`)
          : ['"transaction_type"'];
        
        const metric = plan.metric ? plan.metric.toUpperCase() : 'SUM';
        const metricField = plan.metricField ? this.sanitizeColumn(plan.metricField) : 'amount_ngn';

        const sql = `SELECT ${dimensions.join(', ')}, ${metric}("${metricField}")::numeric AS value, COUNT(*)::bigint AS count FROM "${this.tableName}"${whereClause} GROUP BY ${dimensions.join(', ')} ORDER BY value DESC LIMIT ${queryLimit};`;
        return { sql, params };
      }

      case 'trend': {
        const granularity = 'month'; // default monthly aggregation
        const metric = plan.metric ? plan.metric.toUpperCase() : 'SUM';
        const metricField = plan.metricField ? this.sanitizeColumn(plan.metricField) : 'amount_ngn';

        const sql = `SELECT DATE_TRUNC('${granularity}', "timestamp") AS period, ${metric}("${metricField}")::numeric AS value, COUNT(*)::bigint AS count FROM "${this.tableName}"${whereClause} GROUP BY period ORDER BY period ASC;`;
        return { sql, params };
      }

      case 'comparison': {
        const dimensions = plan.dimensions && plan.dimensions.length > 0
          ? plan.dimensions.map((d) => `"${this.sanitizeColumn(d)}"`)
          : ['"channel"'];
        const metric = plan.metric ? plan.metric.toUpperCase() : 'SUM';
        const metricField = plan.metricField ? this.sanitizeColumn(plan.metricField) : 'amount_ngn';

        const sql = `SELECT ${dimensions.join(', ')}, ${metric}("${metricField}")::numeric AS value, COUNT(*)::bigint AS count FROM "${this.tableName}"${whereClause} GROUP BY ${dimensions.join(', ')} ORDER BY value DESC LIMIT ${queryLimit};`;
        return { sql, params };
      }

      case 'get_rows': {
        const sql = `SELECT * FROM "${this.tableName}"${whereClause} ORDER BY "timestamp" DESC LIMIT ${queryLimit};`;
        return { sql, params };
      }

      default: {
        const sql = `SELECT COUNT(*)::bigint AS count, SUM("amount_ngn")::numeric AS value FROM "${this.tableName}"${whereClause};`;
        return { sql, params };
      }
    }
  }
}
