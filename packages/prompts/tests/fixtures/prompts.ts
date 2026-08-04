import type { PromptVariableDefinition } from "../../src/domain/prompt-variable";

export const householdId = "11111111-1111-1111-1111-111111111111";
export const registryId = "22222222-2222-2222-2222-222222222222";
export const versionId = "33333333-3333-3333-3333-333333333333";

export const sampleVariables: PromptVariableDefinition[] = [
  { name: "childName", type: "string", required: true },
  { name: "age", type: "number", required: true },
  {
    name: "mood",
    type: "enum",
    enumValues: ["happy", "sad"],
    default: "happy",
  },
  { name: "extra", type: "json", required: false },
];

export function createRegistryRecord(
  overrides?: Partial<{
    id: string;
    householdId: string;
    promptKey: string;
    purpose: string;
    createdAt: Date;
    updatedAt: Date;
  }>,
): {
  id: string;
  householdId: string;
  promptKey: string;
  purpose: string;
  createdAt: Date;
  updatedAt: Date;
} {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    householdId,
    promptKey: "story.continuation.v1",
    purpose: "Continuation prompt",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createVersionRecord(
  overrides?: Partial<{
    id: string;
    registryId: string;
    versionNumber: number;
    status: "draft" | "published" | "archived";
    templateBody: string;
    variableSchema: PromptVariableDefinition[];
    modelPreferences: Record<string, unknown>;
    outputSchema: Record<string, unknown>;
    publishedAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>,
): {
  id: string;
  registryId: string;
  versionNumber: number;
  status: "draft" | "published" | "archived";
  templateBody: string;
  variableSchema: PromptVariableDefinition[];
  modelPreferences: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
} {
  const now = new Date();
  return {
    id: versionId,
    registryId,
    versionNumber: 1,
    status: "draft",
    templateBody: "Hello {{childName}}, age {{age}}, mood {{mood}}.",
    variableSchema: sampleVariables,
    modelPreferences: {},
    outputSchema: {},
    publishedAt: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
