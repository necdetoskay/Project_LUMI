import { ValidationError } from "./errors";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSlug(slug: string, field = "slug"): string {
  if (!slug || typeof slug !== "string") {
    throw new ValidationError("INVALID_SLUG", "slug is required", field);
  }
  if (slug.length > 160) {
    throw new ValidationError("INVALID_SLUG", "slug must be at most 160 characters", field);
  }
  if (!SLUG_PATTERN.test(slug)) {
    throw new ValidationError("INVALID_SLUG", "slug must be lower-kebab-case", field);
  }
  return slug;
}

export function validateTitle(title: string, field = "title"): string {
  if (!title || typeof title !== "string") {
    throw new ValidationError("INVALID_TITLE", "title is required", field);
  }
  const trimmed = title.trim();
  if (trimmed.length < 1 || trimmed.length > 300) {
    throw new ValidationError("INVALID_TITLE", "title must be between 1 and 300 characters", field);
  }
  return trimmed;
}

export function validateNarrativeText(text: string): string {
  if (!text || typeof text !== "string") {
    throw new ValidationError("INVALID_NARRATIVE", "narrative_text is required");
  }
  if (text.trim().length < 1) {
    throw new ValidationError("INVALID_NARRATIVE", "narrative_text cannot be empty");
  }
  return text;
}

export function validateSceneKey(key: string): string {
  if (!key || typeof key !== "string") {
    throw new ValidationError("INVALID_SCENE_KEY", "scene_key is required");
  }
  if (key.length > 120) {
    throw new ValidationError("INVALID_SCENE_KEY", "scene_key must be at most 120 characters");
  }
  return key;
}

export function validateSequence(sequence: number, field = "sequence"): number {
  if (!Number.isInteger(sequence) || sequence < 0) {
    throw new ValidationError("INVALID_SEQUENCE", `${field} must be a non-negative integer`, field);
  }
  return sequence;
}

export function validatePositive(value: number, field = "value"): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new ValidationError("INVALID_VERSION", `${field} must be a positive integer`, field);
  }
  return value;
}

export function validateId(id: string, field = "id"): string {
  if (!id || typeof id !== "string") {
    throw new ValidationError("INVALID_ID", `${field} is required`, field);
  }
  return id;
}