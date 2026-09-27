import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmProvider } from '../interfaces/llm-provider.interface';

@Injectable()
export class ClaudeLlmProvider implements LlmProvider {
  readonly providerName = 'claude';
  private readonly logger = new Logger(ClaudeLlmProvider.name);
  private readonly apiKey: string | undefined;
  private readonly modelName: string;
  private readonly workspaceId: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.apiKey =
      this.configService.get<string>('CLAUDE_API_KEY') ||
      this.configService.get<string>('ANTHROPIC_API_KEY');

    this.modelName =
      this.configService.get<string>('CLAUDE_MODEL') ||
      this.configService.get<string>('ANTHROPIC_MODEL') ||
      'claude-sonnet-4-6';

    this.workspaceId =
      this.configService.get<string>('CLAUDE_WORKSPACE_ID') ||
      this.configService.get<string>('ANTHROPIC_WORKSPACE_ID');

    if (this.isConfigured()) {
      this.logger.log(`Anthropic Claude LLM Provider initialized with model [${this.modelName}].`);
    } else {
      this.logger.warn('CLAUDE_API_KEY / ANTHROPIC_API_KEY is not configured.');
    }
  }

  isConfigured(): boolean {
    return !!(
      this.apiKey &&
      this.apiKey !== 'your_claude_api_key_here' &&
      this.apiKey !== 'your_anthropic_api_key_here' &&
      this.apiKey.trim().length > 0
    );
  }

  async generateJson<T>(
    prompt: string,
    systemInstruction: string,
  ): Promise<T> {
    if (!this.isConfigured()) {
      this.logger.warn('Claude client not configured.');
      throw new ServiceUnavailableException('AI service is not configured on this server.');
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey!,
        'anthropic-version': '2023-06-01',
      };

      if (this.workspaceId && this.workspaceId.trim().length > 0) {
        headers['anthropic-workspace-id'] = this.workspaceId.trim();
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.modelName,
          max_tokens: 1024,
          system: `${systemInstruction}\n\nIMPORTANT: Respond strictly with valid JSON only. Do not include markdown code block formatting or introductory text.`,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Claude API HTTP error [${response.status}]: ${errText}`);
        let parsedErrMessage = errText;
        try {
          const parsedErr = JSON.parse(errText);
          if (parsedErr.error?.message) {
            parsedErrMessage = parsedErr.error.message;
          }
        } catch {}
        throw new ServiceUnavailableException(`Claude API error (HTTP ${response.status}): ${parsedErrMessage}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;

      if (!content) {
        this.logger.error('Claude returned empty message content.');
        throw new UnprocessableEntityException('AI returned an empty response.');
      }

      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      }

      try {
        return JSON.parse(cleanedContent) as T;
      } catch {
        this.logger.error(`Failed to parse JSON returned by Claude: ${cleanedContent}`);
        throw new UnprocessableEntityException('AI returned malformed JSON output.');
      }
    } catch (err) {
      if (
        err instanceof UnprocessableEntityException ||
        err instanceof ServiceUnavailableException
      ) {
        throw err;
      }
      const cause = (err as any)?.cause ? ` (${(err as any).cause.message || (err as any).cause})` : '';
      const errMsg = `${(err as Error).message}${cause}`;
      this.logger.error(`Claude API failure: ${errMsg}`);
      throw new ServiceUnavailableException(`AI service (Claude) error: ${errMsg}`);
    }
  }
}
