import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QueryExecutionService } from './query-execution.service';
import { SqlBuilderService } from './sql-builder.service';
import { QueryPlanExecutionValidator } from './validators/query-plan.validator';

@Module({
  imports: [PrismaModule],
  providers: [QueryExecutionService, SqlBuilderService, QueryPlanExecutionValidator],
  exports: [QueryExecutionService, SqlBuilderService, QueryPlanExecutionValidator],
})
export class QueryExecutionModule {}
