import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryPlan } from '../ai/dto/query-plan.dto';
import { SqlBuilderService } from './sql-builder.service';
import { QueryPlanExecutionValidator } from './validators/query-plan.validator';
import { BuiltQuery, QueryExecutionResult, QueryExecutionEvidence } from './query.types';
import { SOURCE_TABLE_NAME, ALLOWED_COLUMNS } from './query.constants';

@Injectable()
export class QueryExecutionService {
  private readonly logger = new Logger(QueryExecutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sqlBuilder: SqlBuilderService,
    private readonly validator: QueryPlanExecutionValidator,
  ) {}

  /**
   * Validates QueryPlan, builds safe parameterized SQL, executes against PostgreSQL, and formats evidence.
   */
  async executeAuthorizedQuery(
    plan: QueryPlan,
    allowedFields?: string[],
    userPermissions: string[] = [],
  ): Promise<QueryExecutionResult> {
    // 1. Defense-in-depth structural validation
    this.validator.validateForExecution(plan);

    // 2. Build safe parameterized SQL
    const builtQuery: BuiltQuery = this.sqlBuilder.buildSql(plan, allowedFields);
    this.logger.log(`Executing SQL: ${builtQuery.query} | Params: ${JSON.stringify(builtQuery.params)}`);

    try {
      // 3. Execute parameterized SQL against PostgreSQL
      const rawRows: any[] = await this.prisma.$queryRawUnsafe(builtQuery.query, ...builtQuery.params);

      // 4. Normalize BigInt, Decimal, and Date values safely
      const rows = this.normalizeRows(rawRows);

      // 5. Build evidence contract (ensuring restricted fields are not leaked for unauthorized roles)
      const evidence = this.buildEvidence(plan, builtQuery, rows, userPermissions);

      // 6. Extract result columns
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      return {
        operation: plan.operation,
        columns,
        rows,
        rowCount: rows.length,
        evidence,
      };
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(`PostgreSQL execution error: ${(err as Error).message}`);
      throw new InternalServerErrorException('Database query execution failed.');
    }
  }

  /**
   * Safely normalizes PostgreSQL data types (BigInt, Decimal, Date) for JSON serialization.
   */
  private normalizeRows(rows: any[]): Record<string, unknown>[] {
    return JSON.parse(
      JSON.stringify(rows, (_, value) => {
        if (typeof value === 'bigint') {
          return Number(value);
        }
        return value;
      }),
    );
  }

  /**
   * Builds execution evidence object. Strips entity fields if user role lacks VIEW_ENTITY_DETAILS.
   */
  private buildEvidence(
    plan: QueryPlan,
    builtQuery: BuiltQuery,
    rows: Record<string, unknown>[],
    userPermissions: string[],
  ): QueryExecutionEvidence {
    const hasEntityAccess = userPermissions.includes('VIEW_ENTITY_DETAILS');

    // Build filter evidence safely
    const filters: Record<string, unknown>[] = [];
    if (plan.dateRange) {
      if (plan.dateRange.from) filters.push({ field: 'timestamp', operator: 'gte', value: plan.dateRange.from });
      if (plan.dateRange.to) filters.push({ field: 'timestamp', operator: 'lte', value: plan.dateRange.to });
    }

    if (plan.filters && typeof plan.filters === 'object') {
      for (const [col, val] of Object.entries(plan.filters)) {
        // Obey RBAC for filter evidence: omit entity fields if user lacks VIEW_ENTITY_DETAILS
        const colConfig = ALLOWED_COLUMNS[col.toLowerCase()];
        if (colConfig && colConfig.entityLevel && !hasEntityAccess) {
          continue;
        }
        filters.push({ field: col, operator: 'eq', value: val });
      }
    }

    // Build dimensions evidence safely
    let groupBy: string[] | undefined;
    if (plan.dimensions && plan.dimensions.length > 0) {
      groupBy = plan.dimensions.filter((d) => {
        const colConfig = ALLOWED_COLUMNS[d.toLowerCase()];
        return !colConfig || !colConfig.entityLevel || hasEntityAccess;
      });
    }

    return {
      queryType: plan.operation,
      filters,
      groupBy,
      aggregate: plan.metric ? `${plan.metric.toUpperCase()}(${plan.metricField || 'amount_ngn'})` : undefined,
      timeGrain: plan.operation === 'trend' ? 'month' : undefined,
      sourceTable: SOURCE_TABLE_NAME,
      returnedRows: rows.length,
    };
  }
}
