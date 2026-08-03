import { ValidationError } from "./errors";

export const PROMPT_VERSION_STATUS = ["draft", "published", "archived"] as const;
export type PromptVersionStatus = (typeof PROMPT_VERSION_STATUS)[number];

export const PROMPT_VARIABLE_TYPES = ["string", "number", "boolean", "enum", "json"] as const;
export type PromptVariableType = (typeof PROMPT_VARIABLE_TYPES)[number];

export interface PromptRegistryState {
  id: string;
  householdId: string;
  promptKey: string;
  purpose: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptVersionState {
  id: string;
  registryId: string;
  versionNumber: number;
  status: PromptVersionStatus;
  templateBody: string;
  variableSchema: PromptVariableDefinition[];
  modelPreferences: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  archivedAt: Date | null;
}

export interface PromptActivationState {
  id: string;
  registryId: string;
  activeVersionId: string;
  householdId: string;
  activatedAt: Date;
  deactivatedAt: Date | null;
}

export interface PromptVariableDefinition {
  name: string;
  type: PromptVariableType;
  required?: boolean;
  default?: unknown;
  enumValues?: string[];
  description?: string;
}

export function assertKnownPromptVersionStatus(value: string): asserts value is PromptVersionStatus {
  if (!(PROMPT_VERSION_STATUS as readonly string[]).includes(value)) {
    throw new ValidationError("INVALID_VERSION_STATUS", `Invalid prompt version status: ${value}`);
  }
}

export function assertKnownPromptVariableType(value: string): asserts value is PromptVariableType {
  if (!(PROMPT_VARIABLE_TYPES as readonly string[]).includes(value)) {
    throw new ValidationError("INVALID_VARIABLE_TYPE", `Invalid prompt variable type: ${value}`);
  }
}
