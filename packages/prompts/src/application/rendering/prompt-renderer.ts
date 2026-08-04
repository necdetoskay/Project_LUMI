import { ValidationError } from "../../domain/errors";
import {
  applyVariables,
  type PromptVariableDefinition,
} from "../../domain/prompt-variable";

export interface RenderedPrompt {
  renderedText: string;
  versionId: string;
  resolvedVariables: Record<string, unknown>;
  tokenEstimate: number;
}

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

function escapeValue(value: string): string {
  return value.replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function tokenEstimate(text: string): number {
  return Math.ceil(text.length / 4);
}

export function renderPrompt(
  template: string,
  versionId: string,
  definitions: PromptVariableDefinition[],
  values: Record<string, unknown>,
): RenderedPrompt {
  const resolved = applyVariables(definitions, values);
  const definedNames = new Set(definitions.map((def) => def.name));

  const renderedText = template.replace(
    PLACEHOLDER_PATTERN,
    (match, name: string) => {
      if (!definedNames.has(name)) {
        return match;
      }
      const value = resolved[name];
      return escapeValue(formatValue(value));
    },
  );

  return {
    renderedText,
    versionId,
    resolvedVariables: resolved,
    tokenEstimate: tokenEstimate(renderedText),
  };
}

export function validateTemplateVariables(
  definitions: PromptVariableDefinition[],
  values: Record<string, unknown>,
): void {
  try {
    applyVariables(definitions, values);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(
      "RENDER_FAILED",
      "Failed to validate template variables",
    );
  }
}
