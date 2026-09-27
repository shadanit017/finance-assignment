import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException, UnprocessableEntityException, BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';
import { QueryPlanValidator } from './query-plan-validator.service';
import { QueryCapabilityService } from './query-capability.service';
import { LLM_PROVIDER } from './constants/ai-tokens';
import { LlmProvider } from './interfaces/llm-provider.interface';
import { GeminiLlmProvider } from './providers/gemini-llm.provider';
import { OpenAiLlmProvider } from './providers/openai-llm.provider';

describe('AiService', () => {
  let service: AiService;

  const mockValidPlanObj = {
    operation: 'aggregate',
    metric: 'sum',
    metricField: 'amount_ngn',
    dimensions: [],
    filters: {},
    dateRange: { from: '2024-01-01', to: '2024-12-31' },
    explanation: 'Calculate total transaction amount for 2024.',
  };

  const createTestingModule = async (isConfigured: boolean = true, mockPlan: any = mockValidPlanObj) => {
    const mockLlmProvider: LlmProvider = {
      providerName: 'mock-provider',
      isConfigured: jest.fn().mockReturnValue(isConfigured),
      generateJson: jest.fn().mockImplementation(async () => {
        if (typeof mockPlan === 'string' && mockPlan === 'MALFORMED') {
          throw new UnprocessableEntityException('Malformed JSON output.');
        }
        if (typeof mockPlan === 'string' && mockPlan === 'API_ERROR') {
          throw new ServiceUnavailableException('API quota exceeded.');
        }
        return mockPlan;
      }),
    };

    return Test.createTestingModule({
      providers: [
        AiService,
        QueryPlanValidator,
        QueryCapabilityService,
        {
          provide: LLM_PROVIDER,
          useValue: mockLlmProvider,
        },
      ],
    }).compile();
  };

  it('should throw ServiceUnavailableException when LLM provider is not configured', async () => {
    const module: TestingModule = await createTestingModule(false);
    service = module.get<AiService>(AiService);

    await expect(service.planFinancialQuery('What was total amount?')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('should throw BadRequestException when question is empty', async () => {
    const module: TestingModule = await createTestingModule(true);
    service = module.get<AiService>(AiService);

    await expect(service.planFinancialQuery('')).rejects.toThrow(BadRequestException);
  });

  it('should process valid LLM response correctly across providers', async () => {
    const module: TestingModule = await createTestingModule(true, mockValidPlanObj);
    service = module.get<AiService>(AiService);

    const result = await service.planFinancialQuery('What was the total transaction amount in 2024?');
    expect(result.plan.operation).toBe('aggregate');
    expect(result.plan.metric).toBe('sum');
    expect(result.plan.metricField).toBe('amount_ngn');
    expect(result.requiredPermission).toBe('VIEW_AGGREGATES');
  });

  it('should throw UnprocessableEntityException when LLM returns malformed JSON', async () => {
    const module: TestingModule = await createTestingModule(true, 'MALFORMED');
    service = module.get<AiService>(AiService);

    await expect(service.planFinancialQuery('What was the total amount?')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('should throw ServiceUnavailableException on LLM API error', async () => {
    const module: TestingModule = await createTestingModule(true, 'API_ERROR');
    service = module.get<AiService>(AiService);

    await expect(service.planFinancialQuery('What was the total amount?')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
