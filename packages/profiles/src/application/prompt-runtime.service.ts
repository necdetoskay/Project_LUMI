import { eq, and } from "drizzle-orm";
import { getProfileDb } from "./db";
import { aiPromptVersions } from "../db/schema/profile";

export type PromptContext = Record<
  string,
  string | number | boolean | null | object
>;

function render(
  template: string,
  allowed: string[],
  required: string[],
  context: PromptContext,
) {
  for (const key of required)
    if (!(key in context) || context[key] == null)
      throw new Error(`PROMPT_CONTEXT_MISSING:${key}`);
  const variables = [...template.matchAll(/{{\s*([A-Za-z0-9_.-]+)\s*}}/g)].map(
    (m) => m[1],
  );
  for (const key of variables)
    if (!allowed.includes(key))
      throw new Error(`PROMPT_VARIABLE_NOT_ALLOWED:${key}`);
  return template.replace(/{{\s*([A-Za-z0-9_.-]+)\s*}}/g, (_, key: string) => {
    const value = context[key];
    if (value == null) return "";
    return typeof value === "string" ? value : JSON.stringify(value);
  });
}

export async function resolveActivePrompt(
  promptKey: string,
  context: PromptContext,
) {
  const db = getProfileDb();
  const [record] = await db
    .select()
    .from(aiPromptVersions)
    .where(
      and(
        eq(aiPromptVersions.promptKey, promptKey),
        eq(aiPromptVersions.status, "active"),
      ),
    )
    .limit(1);
  if (!record) throw new Error(`ACTIVE_PROMPT_NOT_FOUND:${promptKey}`);
  const allowed = record.allowedVariables ?? [];
  const required = record.requiredVariables ?? [];
  return {
    promptKey: record.promptKey,
    promptVersion: record.version,
    system: render(record.systemTemplate, allowed, required, context),
    user: render(record.userTemplate, allowed, required, context),
    outputSchema: record.outputSchema,
    schemaVersion: record.schemaVersion,
    providerOverride: record.providerOverride,
    modelOverride: record.modelOverride,
    generationConfig: record.generationConfig,
  };
}
