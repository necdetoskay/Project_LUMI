export class MediaError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "MediaError";
  }
}

export class CostLimitExceededError extends MediaError {
  constructor(message: string) {
    super(message, "cost_limit_exceeded");
    this.name = "CostLimitExceededError";
  }
}

export class PolicyBlockedError extends MediaError {
  constructor(message: string) {
    super(message, "policy_blocked");
    this.name = "PolicyBlockedError";
  }
}

export class ProviderUnavailableError extends MediaError {
  constructor(message: string) {
    super(message, "provider_unavailable");
    this.name = "ProviderUnavailableError";
  }
}

export class ProviderTimeoutError extends MediaError {
  constructor(message: string) {
    super(message, "provider_timeout");
    this.name = "ProviderTimeoutError";
  }
}

export class SafetyRejectedError extends MediaError {
  constructor(message: string) {
    super(message, "safety_rejected");
    this.name = "SafetyRejectedError";
  }
}

export class ConsistencyRejectedError extends MediaError {
  constructor(message: string) {
    super(message, "consistency_rejected");
    this.name = "ConsistencyRejectedError";
  }
}

export class StorageFailedError extends MediaError {
  constructor(message: string) {
    super(message, "storage_failed");
    this.name = "StorageFailedError";
  }
}
