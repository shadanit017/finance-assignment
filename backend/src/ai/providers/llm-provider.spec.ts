import { ConfigService } from '@nestjs/config';
import { GeminiLlmProvider } from './gemini-llm.provider';
import { OpenAiLlmProvider } from './openai-llm.provider';
import { ClaudeLlmProvider } from './claude-llm.provider';
import { createLlmProvider } from './llm-provider.factory';

describe('LlmProviderFactory', () => {
  let mockConfigService: Partial<ConfigService>;
  let geminiProvider: GeminiLlmProvider;
  let openAiProvider: OpenAiLlmProvider;
  let claudeProvider: ClaudeLlmProvider;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'AI_PROVIDER') return undefined;
        if (key === 'GEMINI_API_KEY') return 'test_gemini_key';
        if (key === 'OPENAI_API_KEY') return 'test_openai_key';
        if (key === 'CLAUDE_API_KEY') return 'test_claude_key';
        return undefined;
      }),
    };

    geminiProvider = new GeminiLlmProvider(mockConfigService as ConfigService);
    openAiProvider = new OpenAiLlmProvider(mockConfigService as ConfigService);
    claudeProvider = new ClaudeLlmProvider(mockConfigService as ConfigService);
  });

  it('should return GeminiLlmProvider when AI_PROVIDER is gemini', () => {
    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'AI_PROVIDER') return 'gemini';
      return undefined;
    });

    const provider = createLlmProvider(
      mockConfigService as ConfigService,
      geminiProvider,
      openAiProvider,
      claudeProvider,
    );
    expect(provider.providerName).toBe('gemini');
  });

  it('should return OpenAiLlmProvider when AI_PROVIDER is openai', () => {
    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'AI_PROVIDER') return 'openai';
      return undefined;
    });

    const provider = createLlmProvider(
      mockConfigService as ConfigService,
      geminiProvider,
      openAiProvider,
      claudeProvider,
    );
    expect(provider.providerName).toBe('openai');
  });

  it('should return ClaudeLlmProvider when AI_PROVIDER is claude or anthropic', () => {
    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'AI_PROVIDER') return 'claude';
      return undefined;
    });

    const provider = createLlmProvider(
      mockConfigService as ConfigService,
      geminiProvider,
      openAiProvider,
      claudeProvider,
    );
    expect(provider.providerName).toBe('claude');
  });

  it('should auto-detect ClaudeLlmProvider if CLAUDE_API_KEY is present and others are absent', () => {
    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'CLAUDE_API_KEY') return 'sk-ant-test-key';
      return undefined;
    });

    const cProvider = new ClaudeLlmProvider(mockConfigService as ConfigService);
    const gProvider = new GeminiLlmProvider(mockConfigService as ConfigService);
    const oProvider = new OpenAiLlmProvider(mockConfigService as ConfigService);

    const provider = createLlmProvider(
      mockConfigService as ConfigService,
      gProvider,
      oProvider,
      cProvider,
    );
    expect(provider.providerName).toBe('claude');
  });
});
