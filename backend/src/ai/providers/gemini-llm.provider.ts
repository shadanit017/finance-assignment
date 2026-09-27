import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { LlmProvider } from '../interfaces/llm-provider.interface';

@Injectable()
export class GeminiLlmProvider implements LlmProvider {
  readonly providerName = 'gemini';
  private readonly logger = new Logger(GeminiLlmProvider.name);
  private aiClient: GoogleGenAI | null = null;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.modelName = this.configService.get<string>('GEMINI_MODEL') || 'gemini-3.8-flash';

    if (apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.trim().length > 0) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey });
        this.logger.log(`Google Gemini LLM Provider initialized with model [${this.modelName}].`);
      } catch (err) {
        this.logger.error(`Failed to initialize Google Gemini SDK: ${(err as Error).message}`);
      }
    } else {
      this.logger.warn('GEMINI_API_KEY is not configured.');
    }
  }

  isConfigured(): boolean {
    return !!this.aiClient;
  }

  async generateJson<T>(
    prompt: string,
    systemInstruction: string,
    jsonSchema?: Record<string, any>,
  ): Promise<T> {
    if (!this.aiClient) {
      this.logger.warn('Gemini client not initialized.');
      throw new ServiceUnavailableException('AI service is not configured on this server.');
    }

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await this.aiClient.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: jsonSchema,
            temperature: 0.1,
          },
        });

        const responseText = response.text;
        if (!responseText) {
          this.logger.error('Gemini returned an empty response text.');
          throw new UnprocessableEntityException('AI returned an empty response.');
        }

        try {
          return JSON.parse(responseText) as T;
        } catch {
          this.logger.error(`Failed to parse JSON returned by Gemini: ${responseText}`);
          throw new UnprocessableEntityException('AI returned malformed JSON output.');
        }
      } catch (err) {
        if (
          err instanceof UnprocessableEntityException ||
          err instanceof ServiceUnavailableException
        ) {
          throw err;
        }

        const errMsg = (err as Error).message || '';
        const isTransient503 = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE');

        if (isTransient503 && attempts < maxAttempts) {
          this.logger.warn(`Gemini API transient demand spike (attempt ${attempts}/${maxAttempts}). Retrying in 1s...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        this.logger.error(`Gemini API failure: ${errMsg}`);
        throw new ServiceUnavailableException('AI service is temporarily unavailable. Please try again in a moment.');
      }
    }

    throw new ServiceUnavailableException('AI service is temporarily unavailable.');
  }
}
