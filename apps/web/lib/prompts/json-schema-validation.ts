export type SchemaValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateJsonSchema(
  value: unknown,
  schema: Record<string, unknown>,
): SchemaValidationResult {
  const errors: string[] = [];
  validate(value, schema, "$", errors);
  return { valid: errors.length === 0, errors };
}

function validate(
  value: unknown,
  schema: Record<string, unknown>,
  path: string,
  errors: string[],
) {
  const type = typeof schema.type === "string" ? schema.type : undefined;
  if (type && !matchesType(value, type)) {
    errors.push(`${path}: expected ${type}`);
    return;
  }
  if (
    Array.isArray(schema.enum) &&
    !schema.enum.some((item) => Object.is(item, value))
  )
    errors.push(`${path}: value is not in enum`);
  if (type === "object" && isObject(value)) {
    const required = Array.isArray(schema.required)
      ? schema.required.filter(
          (item): item is string => typeof item === "string",
        )
      : [];
    for (const key of required)
      if (!(key in value))
        errors.push(`${path}.${key}: required property is missing`);
    if (isObject(schema.properties))
      for (const [key, childSchema] of Object.entries(schema.properties))
        if (key in value && isObject(childSchema))
          validate(value[key], childSchema, `${path}.${key}`, errors);
    if (schema.additionalProperties === false && isObject(schema.properties))
      for (const key of Object.keys(value))
        if (!(key in schema.properties))
          errors.push(`${path}.${key}: additional property is not allowed`);
  }
  if (type === "array" && Array.isArray(value) && isObject(schema.items))
    value.forEach((item, index) =>
      validate(
        item,
        schema.items as Record<string, unknown>,
        `${path}[${index}]`,
        errors,
      ),
    );
}

function matchesType(value: unknown, type: string) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return isObject(value);
  if (type === "integer")
    return typeof value === "number" && Number.isInteger(value);
  return typeof value === type;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
