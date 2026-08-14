import { and, asc, eq, max } from "drizzle-orm";
import { getProfileDb } from "./db";
import {
  aiPromptAuditLog,
  aiPromptVersions,
  type AiPromptAuditAction,
  type AiPromptVersionRecord,
} from "../db/schema/profile";

export interface PromptDraftInput {
  systemTemplate: string;
  userTemplate: string;
  allowedVariables: string[];
  requiredVariables: string[];
  outputSchema: Record<string, unknown>;
  schemaVersion?: string;
  providerOverride?: string | null;
  modelOverride?: string | null;
  generationConfig?: Record<string, unknown>;
}

export interface PromptMutationContext {
  actorUserId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

function assertPromptDraft(input: PromptDraftInput) {
  if (!input.systemTemplate.trim()) throw new Error("PROMPT_SYSTEM_TEMPLATE_REQUIRED");
  if (!input.userTemplate.trim()) throw new Error("PROMPT_USER_TEMPLATE_REQUIRED");
  const allowed = new Set(input.allowedVariables);
  for (const key of input.requiredVariables) {
    if (!allowed.has(key)) throw new Error(`PROMPT_REQUIRED_VARIABLE_NOT_ALLOWED:${key}`);
  }
  const templates = `${input.systemTemplate}\n${input.userTemplate}`;
  for (const match of templates.matchAll(/{{\s*([A-Za-z0-9_.-]+)\s*}}/g)) {
    const key = match[1];
    if (key && !allowed.has(key)) throw new Error(`PROMPT_VARIABLE_NOT_ALLOWED:${key}`);
  }
}

function auditValues(
  promptKey: string,
  promptVersion: number,
  action: AiPromptAuditAction,
  context: PromptMutationContext,
) {
  return {
    promptKey,
    promptVersion,
    action,
    actorUserId: context.actorUserId ?? null,
    reason: context.reason ?? null,
    metadata: context.metadata ?? {},
  };
}

export async function listPromptVersions(promptKey: string) {
  return getProfileDb()
    .select()
    .from(aiPromptVersions)
    .where(eq(aiPromptVersions.promptKey, promptKey))
    .orderBy(asc(aiPromptVersions.version));
}

export async function createPromptDraft(
  promptKey: string,
  input: PromptDraftInput,
  context: PromptMutationContext = {},
) {
  assertPromptDraft(input);
  const db = getProfileDb();
  return db.transaction(async (tx) => {
    const [latest] = await tx
      .select({ version: max(aiPromptVersions.version) })
      .from(aiPromptVersions)
      .where(eq(aiPromptVersions.promptKey, promptKey));
    const version = (latest?.version ?? 0) + 1;
    const [created] = await tx
      .insert(aiPromptVersions)
      .values({
        promptKey,
        version,
        status: "draft",
        systemTemplate: input.systemTemplate,
        userTemplate: input.userTemplate,
        allowedVariables: input.allowedVariables,
        requiredVariables: input.requiredVariables,
        outputSchema: input.outputSchema,
        schemaVersion: input.schemaVersion ?? "v1",
        providerOverride: input.providerOverride ?? null,
        modelOverride: input.modelOverride ?? null,
        generationConfig: input.generationConfig ?? {},
      })
      .returning();
    if (!created) throw new Error("PROMPT_DRAFT_CREATE_FAILED");
    await tx.insert(aiPromptAuditLog).values(
      auditValues(promptKey, version, "draft_created", context),
    );
    return created;
  });
}

export async function clonePromptVersion(
  promptKey: string,
  version: number,
  context: PromptMutationContext = {},
) {
  const db = getProfileDb();
  const [source] = await db
    .select()
    .from(aiPromptVersions)
    .where(
      and(
        eq(aiPromptVersions.promptKey, promptKey),
        eq(aiPromptVersions.version, version),
      ),
    )
    .limit(1);
  if (!source) throw new Error("PROMPT_VERSION_NOT_FOUND");
  return createPromptDraft(promptKey, toPromptDraftInput(source), {
    ...context,
    metadata: { ...context.metadata, clonedFromVersion: version },
  });
}

async function setActivePromptVersion(
  promptKey: string,
  version: number,
  action: "activated" | "rollback",
  context: PromptMutationContext,
) {
  const db = getProfileDb();
  return db.transaction(async (tx) => {
    const [target] = await tx
      .select()
      .from(aiPromptVersions)
      .where(
        and(
          eq(aiPromptVersions.promptKey, promptKey),
          eq(aiPromptVersions.version, version),
        ),
      )
      .limit(1);
    if (!target) throw new Error("PROMPT_VERSION_NOT_FOUND");
    if (target.status === "active") return target;
    const now = new Date();
    await tx
      .update(aiPromptVersions)
      .set({ status: "archived", archivedAt: now, updatedAt: now })
      .where(
        and(
          eq(aiPromptVersions.promptKey, promptKey),
          eq(aiPromptVersions.status, "active"),
        ),
      );
    const [activated] = await tx
      .update(aiPromptVersions)
      .set({
        status: "active",
        activatedAt: now,
        archivedAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(aiPromptVersions.promptKey, promptKey),
          eq(aiPromptVersions.version, version),
        ),
      )
      .returning();
    if (!activated) throw new Error("PROMPT_ACTIVATION_FAILED");
    await tx
      .insert(aiPromptAuditLog)
      .values(auditValues(promptKey, version, action, context));
    return activated;
  });
}

export async function activatePromptVersion(
  promptKey: string,
  version: number,
  context: PromptMutationContext = {},
) {
  return setActivePromptVersion(promptKey, version, "activated", context);
}

export async function rollbackPrompt(
  promptKey: string,
  version: number,
  context: PromptMutationContext = {},
) {
  return setActivePromptVersion(promptKey, version, "rollback", context);
}

export function toPromptDraftInput(record: AiPromptVersionRecord): PromptDraftInput {
  return {
    systemTemplate: record.systemTemplate,
    userTemplate: record.userTemplate,
    allowedVariables: record.allowedVariables,
    requiredVariables: record.requiredVariables,
    outputSchema: record.outputSchema,
    schemaVersion: record.schemaVersion,
    providerOverride: record.providerOverride,
    modelOverride: record.modelOverride,
    generationConfig: record.generationConfig,
  };
}
