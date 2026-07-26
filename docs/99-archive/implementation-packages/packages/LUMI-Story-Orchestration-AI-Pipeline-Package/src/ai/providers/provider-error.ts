export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly providerCode: string,
    public readonly errorCode: string,
    public readonly retryable: boolean,
    public readonly status?: number,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
  }
}
