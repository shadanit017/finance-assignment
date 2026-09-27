import { Injectable, Inject, Logger, ForbiddenException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { PolicyService } from '../policy/policy.service';
import { QueryExecutionService } from '../query-execution/query-execution.service';
import { QueryPlan } from '../ai/dto/query-plan.dto';
import { AuthorizationResult, UserAuthContext } from '../policy/policy.types';
import { QueryExecutionEvidence } from '../query-execution/query.types';
import { LLM_PROVIDER } from '../ai/constants/ai-tokens';
import { LlmProvider } from '../ai/interfaces/llm-provider.interface';
import { PrismaService } from '../prisma/prisma.service';

export interface PlanAndAuthorizeResult {
  status: string;
  question: string;
  plan: QueryPlan;
  authorization: {
    allowed: boolean;
    requiredCapabilities: string[];
    allowedFields: string[];
    deniedFields: string[];
    reason?: string;
  };
}

export interface AskAssistantResponse {
  answer: string;
  queryPlan: QueryPlan;
  result: {
    operation: string;
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
  };
  evidence: QueryExecutionEvidence;
}

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly policyService: PolicyService,
    private readonly queryExecutionService: QueryExecutionService,
    private readonly prisma: PrismaService,
    @Inject(LLM_PROVIDER) private readonly llmProvider: LlmProvider,
  ) {}

  /**
   * Save chat message in database
   */
  async saveChatMessage(data: {
    userId?: string;
    sender: 'user' | 'assistant';
    role: string;
    question?: string;
    answer?: string;
    payload?: any;
    error?: string;
  }) {
    try {
      return await this.prisma.chatMessage.create({
        data,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to save chat message to DB: ${err.message}`);
    }
  }

  /**
   * Retrieve chat history from database
   */
  async getChatHistory(userId?: string) {
    const messages = await this.prisma.chatMessage.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return messages;
  }

  /**
   * Clear chat history from database
   */
  async clearChatHistory(userId?: string) {
    return this.prisma.chatMessage.deleteMany({
      where: userId ? { userId } : {},
    });
  }

  /**
   * Generates a validated QueryPlan and evaluates server-side RBAC policy.
   * Does NOT execute SQL database queries at this stage.
   */
  async planAndAuthorize(
    question: string,
    subject?: string | UserAuthContext | string[],
  ): Promise<PlanAndAuthorizeResult> {
    this.logger.log(`Planning and authorizing question: "${question}"`);

    const { plan } = await this.aiService.planFinancialQuery(question);
    const userSubject = subject || ['VIEW_AGGREGATES'];

    const authResult: AuthorizationResult = await this.policyService.authorizeQuery(
      userSubject,
      plan,
    );

    if (!authResult.allowed) {
      this.logger.warn(`Authorization DENIED for question "${question}": ${authResult.reason}`);
      throw new ForbiddenException(
        authResult.reason || 'You are not authorized to perform this type of financial analysis.',
      );
    }

    return {
      status: 'success',
      question,
      plan,
      authorization: {
        allowed: true,
        requiredCapabilities: authResult.requiredCapabilities,
        allowedFields: authResult.allowedFields,
        deniedFields: authResult.deniedFields,
      },
    };
  }

  /**
   * Complete End-to-End Query Flow:
   * Question -> QueryPlan -> Validation -> Authorization -> Safe SQL -> PostgreSQL Execution -> Evidence -> Grounded Answer -> DB Persist
   */
  async processQuestion(
    question: string,
    subject?: string | UserAuthContext | string[],
    userId?: string,
    activeRoleName: string = 'Viewer',
  ): Promise<AskAssistantResponse> {
    this.logger.log(`Processing assistant question end-to-end: "${question}"`);

    // Save User Question to Database
    await this.saveChatMessage({
      userId,
      sender: 'user',
      role: activeRoleName,
      question,
    });

    try {
      // 1. Generate & validate structured QueryPlan
      const { plan } = await this.aiService.planFinancialQuery(question);

      // Handle conversational / non-financial input directly without SQL execution
      if (plan.operation === 'conversational') {
        const conversationalAnswer =
          plan.explanation ||
          'Hello! I am your AI Financial Analytics Assistant. How can I help you analyze your financial transaction data today?';

        const userPerms =
          typeof subject === 'object' && Array.isArray((subject as any).permissions)
            ? (subject as any).permissions
            : Array.isArray(subject)
              ? subject
              : ['VIEW_AGGREGATES'];

        const responsePayload: AskAssistantResponse = {
          answer: conversationalAnswer,
          queryPlan: plan,
          result: {
            operation: 'conversational',
            columns: [],
            rows: [],
            rowCount: 0,
          },
          evidence: {
            queryType: 'conversational',
            filters: [],
            sourceTable: 'none',
            returnedRows: 0,
          },
        };

        await this.saveChatMessage({
          userId,
          sender: 'assistant',
          role: activeRoleName,
          answer: conversationalAnswer,
          payload: responsePayload,
        });

        return responsePayload;
      }

      // 2. Resolve user authorization context
      const userSubject = subject || ['VIEW_AGGREGATES'];

      // 3. Perform server-side RBAC authorization
      const authResult: AuthorizationResult = await this.policyService.authorizeQuery(
        userSubject,
        plan,
      );

      if (!authResult.allowed) {
        const errorReason = authResult.reason || 'You are not authorized to perform this type of financial analysis.';
        this.logger.warn(`Authorization DENIED: ${errorReason}`);

        // Save Refusal Error to DB
        await this.saveChatMessage({
          userId,
          sender: 'assistant',
          role: activeRoleName,
          error: errorReason,
        });

        throw new ForbiddenException(errorReason);
      }

      // Resolve permissions array for evidence building
      let userPermissions: string[] = [];
      if (typeof userSubject === 'string') {
        const userCtx = await this.policyService.getUserPermissionsFromDb(userSubject);
        userPermissions = userCtx.permissions;
      } else if (Array.isArray(userSubject)) {
        userPermissions = userSubject;
      } else if (userSubject && Array.isArray(userSubject.permissions)) {
        userPermissions = userSubject.permissions;
      }

      // 4. Execute authorized safe SQL query against PostgreSQL
      const executionResult = await this.queryExecutionService.executeAuthorizedQuery(
        plan,
        authResult.allowedFields,
        userPermissions,
      );

      // 5. Synthesize grounded answer using LLM or smart natural language formatter
      let answer = '';
      if (this.llmProvider.isConfigured()) {
        try {
          const synthesisPrompt = `
You are a senior financial analyst assistant. Synthesize a concise, clear, natural language response based STRICTLY on the following database query results.

User Question: "${question}"
Executed Query Explanation: "${plan.explanation || ''}"
Database Evidence Rows:
${JSON.stringify(executionResult.rows, null, 2)}

Instructions:
- Ground your answer strictly in the provided database evidence rows.
- State key monetary figures clearly (formatted as NGN currency with commas, e.g., ₦328,109,942,600.00).
- Do not output raw JSON or internal database objects. Return clean, professional, conversational financial prose.
`;
          const jsonResponse = await this.llmProvider.generateJson<{ summary: string }>(
            synthesisPrompt,
            'Provide a json response in format: { "summary": "your concise grounded financial response here" }',
          );
          answer = jsonResponse.summary || this.formatFinancialSummary(executionResult.rows, question, plan);
        } catch (err) {
          this.logger.warn(`Failed to synthesize natural language answer via LLM: ${(err as Error).message}`);
          answer = this.formatFinancialSummary(executionResult.rows, question, plan);
        }
      } else {
        answer = this.formatFinancialSummary(executionResult.rows, question, plan);
      }

      const responsePayload: AskAssistantResponse = {
        answer,
        queryPlan: plan,
        result: {
          operation: executionResult.operation,
          columns: executionResult.columns,
          rows: executionResult.rows,
          rowCount: executionResult.rowCount,
        },
        evidence: executionResult.evidence,
      };

      // Save Assistant Response to DB
      await this.saveChatMessage({
        userId,
        sender: 'assistant',
        role: activeRoleName,
        answer,
        payload: responsePayload,
      });

      return responsePayload;
    } catch (err: any) {
      if (!(err instanceof ForbiddenException)) {
        await this.saveChatMessage({
          userId,
          sender: 'assistant',
          role: activeRoleName,
          error: err.message || 'An error occurred while processing query',
        });
      }
      throw err;
    }
  }

  private formatFinancialSummary(rows: any[], question: string, plan?: any): string {
    if (!rows || rows.length === 0) {
      return 'No financial records were found matching your query criteria.';
    }

    if (rows.length === 1) {
      const row = rows[0];
      const keys = Object.keys(row);

      const valueKey = keys.find(
        (k) =>
          k.toLowerCase().includes('value') ||
          k.toLowerCase().includes('sum') ||
          k.toLowerCase().includes('total') ||
          k.toLowerCase().includes('amount'),
      );
      const countKey = keys.find((k) => k.toLowerCase().includes('count'));

      if (valueKey && row[valueKey] !== undefined) {
        const numVal = Number(row[valueKey]);
        const formattedMoney = !isNaN(numVal)
          ? `₦${numVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : String(row[valueKey]);

        let countSuffix = '';
        if (countKey && row[countKey] !== undefined) {
          const countVal = Number(row[countKey]);
          const formattedCount = !isNaN(countVal) ? countVal.toLocaleString() : String(row[countKey]);
          countSuffix = ` across ${formattedCount} total transactions`;
        }

        return `The total transaction amount was ${formattedMoney}${countSuffix}.`;
      }
    }

    const summaryLines = rows.map((r) => {
      const entries = Object.entries(r).map(([k, v]) => {
        const num = Number(v);
        if (!isNaN(num) && typeof v !== 'boolean') {
          if (
            k.toLowerCase().includes('amount') ||
            k.toLowerCase().includes('val') ||
            k.toLowerCase().includes('sum') ||
            k.toLowerCase().includes('total')
          ) {
            return `${k}: ₦${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
          return `${k}: ${num.toLocaleString()}`;
        }
        return `${k}: ${v}`;
      });
      return `• ${entries.join(', ')}`;
    });

    return `Financial Query Results:\n${summaryLines.join('\n')}`;
  }
}
