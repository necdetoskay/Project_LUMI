import { z } from "zod";

import type { FailureState } from "./generation-types";

export class GenerationError extends Error {
  public readonly failureState: FailureState;

  constructor(failureState: FailureState, message: string) {
    super(message);
    this.name = "GenerationError";
    this.failureState = failureState;
  }
}

export class ProviderUnavailableError extends GenerationError {
  constructor(message = "Generation provider is unavailable") {
    super("provider_unavailable", message);
    this.name = "ProviderUnavailableError";
  }
}

export class ProviderTimeoutError extends GenerationError {
  constructor(message = "Generation provider timed out") {
    super("provider_timeout", message);
    this.name = "ProviderTimeoutError";
  }
}

export class SchemaValidationError extends GenerationError {
  constructor(message = "Generated output failed schema validation") {
    super("schema_invalid", message);
    this.name = "SchemaValidationError";
  }
}

export class SafetyBlockedError extends GenerationError {
  constructor(message = "Generated output was blocked by safety policy") {
    super("safety_blocked", message);
    this.name = "SafetyBlockedError";
  }
}

export class CanonViolationError extends GenerationError {
  constructor(message = "Generated output violated canon rules") {
    super("canon_violation", message);
    this.name = "CanonViolationError";
  }
}

export class ContinuityViolationError extends GenerationError {
  constructor(message = "Generated output violated continuity rules") {
    super("continuity_violation", message);
    this.name = "ContinuityViolationError";
  }
}

export class RepairLimitReachedError extends GenerationError {
  constructor(message = "Generation repair limit reached") {
    super("repair_limit_reached", message);
    this.name = "RepairLimitReachedError";
  }
}

export const generationErrorSchema = z.object({
  name: z.string(),
  message: z.string(),
  failureState: z.string(),
});
