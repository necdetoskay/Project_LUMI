export class MediaProviderError extends Error {
  constructor(
    message: string,
    readonly code:
      | "rate_limit"
      | "timeout"
      | "invalid_request"
      | "moderation"
      | "provider_unavailable"
      | "unknown",
    readonly retryable: boolean,
    readonly providerCode: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "MediaProviderError";
  }
}
