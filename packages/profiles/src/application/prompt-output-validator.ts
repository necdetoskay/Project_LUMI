export class PromptOutputValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("LLM_OUTPUT_SCHEMA_INVALID");
    this.name = "PromptOutputValidationError";
  }
}

type JsonSchema = Record<string, unknown>;

export interface PromptOutputValidationOptions {
  allowOverMaxLength?: boolean;
  synthesizeSuggestionKeys?: boolean;
}

function typeMatches(value: unknown, type: string) {
  if (type === "object")
    return typeof value === "object" && value !== null && !Array.isArray(value);
  if (type === "array") return Array.isArray(value);
  if (type === "string") return typeof value === "string";
  if (type === "number")
    return typeof value === "number" && Number.isFinite(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "boolean") return typeof value === "boolean";
  if (type === "null") return value === null;
  return true;
}

function validateNode(
  value: unknown,
  schema: JsonSchema,
  path: string,
  issues: string[],
  options: PromptOutputValidationOptions,
) {
  const type = schema.type;
  if (typeof type === "string" && !typeMatches(value, type)) {
    issues.push(`${path}: expected ${type}`);
    return;
  }

  if (typeof value === "string") {
    if (typeof schema.minLength === "number" && value.length < schema.minLength)
      issues.push(`${path}: shorter than minLength`);
    if (
      !options.allowOverMaxLength &&
      typeof schema.maxLength === "number" &&
      value.length > schema.maxLength
    )
      issues.push(`${path}: longer than maxLength`);
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems)
      issues.push(`${path}: fewer than minItems`);
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems)
      issues.push(`${path}: more than maxItems`);
    if (schema.items && typeof schema.items === "object")
      value.forEach((item, index) =>
        validateNode(
          item,
          schema.items as JsonSchema,
          `${path}[${index}]`,
          issues,
          options,
        ),
      );
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const required = Array.isArray(schema.required)
      ? schema.required.filter((key): key is string => typeof key === "string")
      : [];
    for (const key of required)
      if (!(key in record)) issues.push(`${path}.${key}: required`);
    const properties =
      schema.properties && typeof schema.properties === "object"
        ? (schema.properties as Record<string, JsonSchema>)
        : {};
    for (const [key, childSchema] of Object.entries(properties))
      if (key in record)
        validateNode(record[key], childSchema, `${path}.${key}`, issues, options);
  }
}

function normalizeDirectSuggestionArray(
  value: unknown,
  schema: JsonSchema,
): unknown {
  if (!Array.isArray(value) || schema.type !== "object") return value;

  const required = Array.isArray(schema.required)
    ? schema.required.filter((key): key is string => typeof key === "string")
    : [];
  if (required.length !== 1 || required[0] !== "suggestions") return value;

  const properties =
    schema.properties && typeof schema.properties === "object"
      ? (schema.properties as Record<string, JsonSchema>)
      : {};
  if (properties.suggestions?.type !== "array") return value;

  return { suggestions: value };
}

function synthesizeSuggestionKeys(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.suggestions)) return value;
  return {
    ...record,
    suggestions: record.suggestions.map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return item;
      const candidate = item as Record<string, unknown>;
      if (typeof candidate.key === "string" && candidate.key.trim()) return item;
      return { ...candidate, key: `candidate-${index + 1}` };
    }),
  };
}

export function parseAndValidatePromptOutput(
  raw: string,
  schema: JsonSchema,
  options: PromptOutputValidationOptions = {},
): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  let value: unknown;
  try {
    value = JSON.parse(cleaned);
  } catch {
    throw new Error("LLM_OUTPUT_INVALID_JSON");
  }
  value = normalizeDirectSuggestionArray(value, schema);
  if (options.synthesizeSuggestionKeys) value = synthesizeSuggestionKeys(value);
  const issues: string[] = [];
  validateNode(value, schema, "$", issues, options);
  if (issues.length) throw new PromptOutputValidationError(issues);
  return value;
}
