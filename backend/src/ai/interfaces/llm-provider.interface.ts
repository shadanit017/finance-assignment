export interface LlmProvider {
  readonly providerName: string;
  isConfigured(): boolean;
  generateJson<T>(
    prompt: string,
    systemInstruction: string,
    jsonSchema?: Record<string, any>,
  ): Promise<T>;
}
