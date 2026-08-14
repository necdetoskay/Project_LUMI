export class PromptOutputValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super("LLM_OUTPUT_SCHEMA_INVALID");
    this.name = "PromptOutputValidationError";
  }
}

type JsonSchema = Record<string, unknown>;

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
) {
  const type = schema.type;
  if (typeof type === "string" && !typeMatches(value, type)) {
    issues.push(`${path}: expected ${type}`);
    return;
  }

  if (typeof value === "string") {
    if (typeof schema.minLength === "number" && value.length < schema.minLength)
      issues.push(`${path}: shorter than minLength`);
    if (typeof schema.maxLength === "number" && value.length > schema.maxLength)
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
        validateNode(record[key], childSchema, `${path}.${key}`, issues);
  }
}

export function parseAndValidatePromptOutput(
  raw: string,
  schema: JsonSchema,
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
  const issues: string[] = [];
  validateNode(value, schema, "$", issues);
  if (issues.length) throw new PromptOutputValidationError(issues);
  return value;
}
