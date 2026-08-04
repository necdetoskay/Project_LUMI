import { ValidationError } from "./errors";

const PROMPT_KEY_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

export function validateId(id: string, field = "id"): string {
  if (!id || typeof id !== "string") {
    throw new ValidationError("INVALID_ID", `${field} is required`, field);
  }
  return id;
}

export function validatePromptKey(key: string, field = "promptKey"): string {
  if (!key || typeof key !== "string") {
    throw new ValidationError(
      "INVALID_PROMPT_KEY",
      "promptKey is required",
      field,
    );
  }
  if (key.length > 160) {
    throw new ValidationError(
      "INVALID_PROMPT_KEY",
      "promptKey must be at most 160 characters",
      field,
    );
  }
  if (!PROMPT_KEY_PATTERN.test(key)) {
    throw new ValidationError(
      "INVALID_PROMPT_KEY",
      "promptKey must be lower-kebab-case or dot-separated identifiers",
      field,
    );
  }
  return key;
}

export function validatePurpose(
  purpose: string | undefined,
  field = "purpose",
): string {
  if (purpose === undefined || purpose === "") {
    return "";
  }
  if (typeof purpose !== "string") {
    throw new ValidationError(
      "INVALID_PURPOSE",
      "purpose must be a string",
      field,
    );
  }
  if (purpose.length > 500) {
    throw new ValidationError(
      "INVALID_PURPOSE",
      "purpose must be at most 500 characters",
      field,
    );
  }
  return purpose;
}

export function validateVersionNumber(
  value: number,
  field = "versionNumber",
): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new ValidationError(
      "INVALID_VERSION",
      `${field} must be a positive integer`,
      field,
    );
  }
  return value;
}

export function validateTemplateBody(
  body: string,
  field = "templateBody",
): string {
  if (!body || typeof body !== "string") {
    throw new ValidationError(
      "INVALID_TEMPLATE",
      "templateBody is required",
      field,
    );
  }
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    throw new ValidationError(
      "INVALID_TEMPLATE",
      "templateBody cannot be empty",
      field,
    );
  }
  if (trimmed.length > 50_000) {
    throw new ValidationError(
      "INVALID_TEMPLATE",
      "templateBody exceeds maximum length",
      field,
    );
  }
  return trimmed;
}
