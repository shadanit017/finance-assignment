import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmProvider } from '../interfaces/llm-provider.interface';

@Injectable()
export class OpenAiLlmProvider implements LlmProvider {
  readonly providerName = 'openai';
  private readonly logger = new Logger(OpenAiLlmProvider.name);
  private readonly apiKey: string | undefined;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.modelName = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';

    if (this.apiKey && this.apiKey !== 'your_openai_api_key_here' && this.apiKey.trim().length > 0) {
      this.logger.log(`OpenAI ChatGPT LLM Provider initialized with model [${this.modelName}].`);
    } else {
      this.logger.warn('OPENAI_API_KEY is not configured.');
    }
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.apiKey !== 'your_openai_api_key_here' && this.apiKey.trim().length > 0);
  }

  async generateJson<T>(
    prompt: string,
    systemInstruction: string,
  ): Promise<T> {
    if (!this.isConfigured()) {
      this.logger.warn('OpenAI client not configured.');
      throw new ServiceUnavailableException('AI service is not configured on this server.');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`OpenAI API HTTP error [${response.status}]: ${errText}`);
        throw new ServiceUnavailableException(`AI service error: HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        this.logger.error('OpenAI returned empty message content.');
        throw new UnprocessableEntityException('AI returned an empty response.');
      }

      try {
        return JSON.parse(content) as T;
      } catch {
        this.logger.error(`Failed to parse JSON returned by OpenAI: ${content}`);
        throw new UnprocessableEntityException('AI returned malformed JSON output.');
      }
    } catch (err) {
      if (
        err instanceof UnprocessableEntityException ||
        err instanceof ServiceUnavailableException
      ) {
        throw err;
      }
      this.logger.error(`OpenAI API failure: ${(err as Error).message}`);
      throw new ServiceUnavailableException('AI service is temporarily unavailable.');
    }
  }
}
