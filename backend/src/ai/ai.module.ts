import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { QueryPlanValidator } from './query-plan-validator.service';
import { QueryCapabilityService } from './query-capability.service';
import { GeminiLlmProvider } from './providers/gemini-llm.provider';
import { OpenAiLlmProvider } from './providers/openai-llm.provider';
import { ClaudeLlmProvider } from './providers/claude-llm.provider';
import { createLlmProvider } from './providers/llm-provider.factory';
import { LLM_PROVIDER } from './constants/ai-tokens';

@Module({
  providers: [
    GeminiLlmProvider,
    OpenAiLlmProvider,
    ClaudeLlmProvider,
    {
      provide: LLM_PROVIDER,
      useFactory: createLlmProvider,
      inject: [ConfigService, GeminiLlmProvider, OpenAiLlmProvider, ClaudeLlmProvider],
    },
    AiService,
    QueryPlanValidator,
    QueryCapabilityService,
  ],
  exports: [AiService, QueryPlanValidator, QueryCapabilityService, LLM_PROVIDER],
})
export class AiModule {}
