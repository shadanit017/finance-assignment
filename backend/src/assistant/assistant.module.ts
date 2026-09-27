import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { PolicyModule } from '../policy/policy.module';
import { AiModule } from '../ai/ai.module';
import { FinancialDataModule } from '../financial-data/financial-data.module';
import { QueryExecutionModule } from '../query-execution/query-execution.module';

@Module({
  imports: [PolicyModule, AiModule, FinancialDataModule, QueryExecutionModule],
  controllers: [AssistantController],
  providers: [AssistantService],
  exports: [AssistantService],
})
export class AssistantModule {}
