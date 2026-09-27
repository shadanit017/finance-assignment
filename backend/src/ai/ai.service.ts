import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryPlan } from './dto/query-plan.dto';
import { QUERY_PLAN_GEMINI_SCHEMA, FINANCIAL_SYSTEM_INSTRUCTION } from './schemas/query-plan.schema';
import { QueryPlanValidator } from './query-plan-validator.service';
import { QueryCapabilityService } from './query-capability.service';
import { LlmProvider } from './interfaces/llm-provider.interface';
import { LLM_PROVIDER } from './constants/ai-tokens';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(LLM_PROVIDER) private readonly llmProvider: LlmProvider,
    private readonly validator: QueryPlanValidator,
    private readonly capabilityService: QueryCapabilityService,
  ) {
    this.logger.log(`AiService initialized using LLM Provider: [${this.llmProvider.providerName}]`);
  }

  async planFinancialQuery(question: string): Promise<{ plan: QueryPlan; requiredPermission: string }> {
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      throw new BadRequestException('A valid non-empty question is required.');
    }

    if (!this.llmProvider.isConfigured()) {
      this.logger.warn(`LLM Provider [${this.llmProvider.providerName}] is not configured.`);
      throw new ServiceUnavailableException('AI service is not configured on this server.');
    }

    const safeSnippet = question.length > 60 ? `${question.substring(0, 60)}...` : question;
    this.logger.log(
      `AI request started via provider [${this.llmProvider.providerName}] for question: "${safeSnippet}"`,
    );

    // Fast path for common greetings & general assistant queries
    const lower = question.trim().toLowerCase();
    const isGreeting = /^(how are you|hello|hi|hey|greetings|who are you|what can you do|help)\??$/i.test(lower);
    if (isGreeting) {
      let explanation =
        'Hello! I am doing well, thank you! I am your AI Financial Analytics Assistant. How can I help you analyze your financial transaction data today?';
      if (lower.includes('who are you')) {
        explanation =
          'I am your AI Financial Insights Assistant. I assist you in querying, analyzing, and obtaining grounded insights from your financial transactions dataset.';
      } else if (lower.includes('what can you do') || lower.includes('help')) {
        explanation =
          'You can ask me questions such as: "What is the total transaction amount in 2024?", "Show me monthly trends", "Compare amounts by state", or "List recent transactions".';
      }

      return {
        plan: {
          operation: 'conversational',
          explanation,
        },
        requiredPermission: 'VIEW_AGGREGATES',
      };
    }

    // Call the abstracted LLM Provider to get the JSON structure
    const rawPlanJson = await this.llmProvider.generateJson<any>(
      question,
      FINANCIAL_SYSTEM_INSTRUCTION,
      QUERY_PLAN_GEMINI_SCHEMA,
    );

    // Validate the generated plan against security rules and allowed schema
    const validatedPlan = this.validator.validate(rawPlanJson);

    // Derive required capability strictly on the backend
    const requiredPermission = this.capabilityService.determineRequiredPermission(validatedPlan.operation);

    this.logger.log(
      `AI request completed via [${this.llmProvider.providerName}]. Operation: [${validatedPlan.operation}], Required Capability: [${requiredPermission}]`,
    );

    return {
      plan: validatedPlan,
      requiredPermission,
    };
  }
}
