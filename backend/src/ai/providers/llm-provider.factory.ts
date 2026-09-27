import { ConfigService } from '@nestjs/config';
import { GeminiLlmProvider } from './gemini-llm.provider';
import { OpenAiLlmProvider } from './openai-llm.provider';
import { ClaudeLlmProvider } from './claude-llm.provider';
import { LlmProvider } from '../interfaces/llm-provider.interface';

export const createLlmProvider = (
  configService: ConfigService,
  geminiProvider: GeminiLlmProvider,
  openAiProvider: OpenAiLlmProvider,
  claudeProvider: ClaudeLlmProvider,
): LlmProvider => {
  const providerName = configService.get<string>('AI_PROVIDER')?.toLowerCase();

  if (providerName === 'claude' || providerName === 'anthropic') {
    return claudeProvider;
  }

  if (providerName === 'openai' || providerName === 'chatgpt') {
    return openAiProvider;
  }

  if (providerName === 'gemini') {
    if (!geminiProvider.isConfigured() && claudeProvider.isConfigured()) {
      return claudeProvider;
    }
    if (!geminiProvider.isConfigured() && openAiProvider.isConfigured()) {
      return openAiProvider;
    }
    return geminiProvider;
  }

  // Auto-detection based on configured keys
  if (claudeProvider.isConfigured()) {
    return claudeProvider;
  }

  if (openAiProvider.isConfigured()) {
    return openAiProvider;
  }

  if (geminiProvider.isConfigured()) {
    return geminiProvider;
  }

  // Default fallback
  return geminiProvider;
};
