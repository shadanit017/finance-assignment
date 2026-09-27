import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialSchemaRegistry } from './financial-schema';
import { SENSITIVE_FIELDS } from './constants/financial-fields';
import { FinancialSqlBuilderService, ParameterizedSql } from './financial-sql-builder.service';
import { QueryPlan } from '../ai/dto/query-plan.dto';

@Injectable()
export class FinancialDataService {
  private readonly logger = new Logger(FinancialDataService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sqlBuilder: FinancialSqlBuilderService,
  ) {}

  getSchemaOverview() {
    return {
      tableName: 'financial_transactions',
      totalColumns: FinancialSchemaRegistry.getAllFields().length,
      sensitiveFields: SENSITIVE_FIELDS,
      columns: FinancialSchemaRegistry.getAllFields().map((field) =>
        FinancialSchemaRegistry.getColumnMetadata(field),
      ),
    };
  }

  async getOverviewStats() {
    const totalCount = await this.prisma.financialTransaction.count();
    const aggregate = await this.prisma.financialTransaction.aggregate({
      _sum: { amountNgn: true },
      _avg: { amountNgn: true },
    });

    return {
      status: 'ok',
      totalTransactions: totalCount,
      totalVolumeNgn: aggregate._sum.amountNgn || 0,
      averageTransactionNgn: aggregate._avg.amountNgn || 0,
    };
  }

  /**
   * Executes a parameterized QueryPlan against PostgreSQL.
   */
  async executeQueryPlan(plan: QueryPlan): Promise<{ sql: string; params: any[]; rows: any[] }> {
    const { sql, params }: ParameterizedSql = this.sqlBuilder.buildSql(plan);
    this.logger.log(`Executing SQL: ${sql} with params: ${JSON.stringify(params)}`);

    try {
      const rows: any[] = await this.prisma.$queryRawUnsafe(sql, ...params);
      
      // Serialize BigInt and Decimal values for clean JSON output
      const serializedRows = JSON.parse(
        JSON.stringify(rows, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
      );

      return {
        sql,
        params,
        rows: serializedRows,
      };
    } catch (err) {
      this.logger.error(`Database query execution failed: ${(err as Error).message}`);
      throw new InternalServerErrorException('Failed to execute financial database query.');
    }
  }
}
