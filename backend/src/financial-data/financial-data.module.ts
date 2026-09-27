import { Module } from '@nestjs/common';
import { FinancialDataController } from './financial-data.controller';
import { FinancialDataService } from './financial-data.service';
import { FinancialSqlBuilderService } from './financial-sql-builder.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QueryExecutionModule } from '../query-execution/query-execution.module';

@Module({
  imports: [PrismaModule, QueryExecutionModule],
  controllers: [FinancialDataController],
  providers: [FinancialDataService, FinancialSqlBuilderService],
  exports: [FinancialDataService, FinancialSqlBuilderService],
})
export class FinancialDataModule {}
