import { ValidationError } from "./errors";
import type {
  PromptVariableDefinition,
  PromptVariableType,
} from "./prompt-types";
import { PROMPT_VARIABLE_TYPES } from "./prompt-types";

export { PROMPT_VARIABLE_TYPES };
export type { PromptVariableDefinition, PromptVariableType };

export function validateVariableDefinition(
  def: PromptVariableDefinition,
): void {
  if (!def.name || typeof def.name !== "string") {
    throw new ValidationError(
      "INVALID_VARIABLE",
      "Variable name is required",
      "name",
    );
  }
  if (!(PROMPT_VARIABLE_TYPES as readonly string[]).includes(def.type)) {
    throw new ValidationError(
      "INVALID_VARIABLE",
      `Invalid variable type: ${def.type}`,
      "type",
    );
  }
  if (def.type === "enum") {
    if (!Array.isArray(def.enumValues) || def.enumValues.length === 0) {
      throw new ValidationError(
        "INVALID_VARIABLE",
        "enum variables require enumValues",
        "enumValues",
      );
    }
  }
}

export function resolveVariableValue(
  def: PromptVariableDefinition,
  provided: unknown,
): unknown {
  validateVariableDefinition(def);

  let value = provided;
  if (value === undefined && def.default !== undefined) {
    value = def.default;
  }

  if (value === undefined) {
    if (def.required) {
      throw new ValidationError(
        "MISSING_REQUIRED_VARIABLE",
        `Variable ${def.name} is required`,
        def.name,
      );
    }
    return undefined;
  }

  switch (def.type) {
    case "string": {
      if (typeof value !== "string") {
        throw new ValidationError(
          "TYPE_MISMATCH",
          `Variable ${def.name} must be a string`,
          def.name,
        );
      }
      return value;
    }
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new ValidationError(
          "TYPE_MISMATCH",
          `Variable ${def.name} must be a number`,
          def.name,
        );
      }
      return value;
    }
    case "boolean": {
      if (typeof value !== "boolean") {
        throw new ValidationError(
          "TYPE_MISMATCH",
          `Variable ${def.name} must be a boolean`,
          def.name,
        );
      }
      return value;
    }
    case "enum": {
      if (typeof value !== "string") {
        throw new ValidationError(
          "TYPE_MISMATCH",
          `Variable ${def.name} must be a string enum value`,
          def.name,
        );
      }
      const allowed = def.enumValues ?? [];
      if (!allowed.includes(value)) {
        throw new ValidationError(
          "INVALID_ENUM_VALUE",
          `Variable ${def.name} must be one of ${allowed.join(", ")}`,
          def.name,
        );
      }
      return value;
    }
    case "json": {
      if (
        value === null ||
        (typeof value !== "object" &&
          typeof value !== "string" &&
          typeof value !== "number" &&
          typeof value !== "boolean")
      ) {
        throw new ValidationError(
          "TYPE_MISMATCH",
          `Variable ${def.name} must be JSON-serializable`,
          def.name,
        );
      }
      return value;
    }
    default: {
      throw new ValidationError(
        "INVALID_VARIABLE",
        `Unsupported variable type: ${def.type}`,
        def.name,
      );
    }
  }
}

export function applyVariables(
  definitions: PromptVariableDefinition[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const def of definitions) {
    resolved[def.name] = resolveVariableValue(def, values[def.name]);
  }
  return resolved;
}
