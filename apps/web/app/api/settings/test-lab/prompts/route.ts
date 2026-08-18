import { NextResponse } from "next/server";

import {
  activatePromptVersion,
  createPromptDraftFromVersion,
  getLlmSettings,
  getPromptWorkspace,
  resolvePromptVersion,
  rollbackPrompt,
  type PromptDraftPatch,
} from "@lumi/profiles/application";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const GET = observeHandler((request: Request) => {
  return withParent(async (parent) => {
    const { searchParams } = new URL(request.url);
    const householdId = requiredString(
      searchParams.get("householdId"),
      "householdId",
    );
    const promptKey = requiredString(
      searchParams.get("promptKey"),
      "promptKey",
    );

    try {
      await getLlmSettings(parent.id, householdId);
      return NextResponse.json({ data: await getPromptWorkspace(promptKey) });
    } catch (error) {
      return handleError(error);
    }
  });
}, "/api/settings/test-lab/prompts");

export const POST = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const body = (await readRequestBody(request)) as Record<string, unknown>;
    const action = requiredString(body.action, "action");
    const householdId = requiredString(body.householdId, "householdId");

    try {
      await getLlmSettings(parent.id, householdId);
      const promptKey = requiredString(body.promptKey, "promptKey");

      if (action === "create-draft") {
        const sourceVersion = requiredPositiveInteger(
          body.sourceVersion,
          "sourceVersion",
        );
        const patch = asPromptDraftPatch(body.patch);
        const draft = await createPromptDraftFromVersion(
          promptKey,
          sourceVersion,
          patch,
          {
            actorUserId: parent.id,
            reason: "test_lab_draft",
            metadata: { source: "test_lab" },
          },
        );
        return NextResponse.json({
          data: { draft, workspace: await getPromptWorkspace(promptKey) },
        });
      }

      if (action === "render-version") {
        const version = requiredPositiveInteger(body.version, "version");
        const context = asPromptContext(body.context);
        return NextResponse.json({
          data: await resolvePromptVersion(promptKey, version, context),
        });
      }

      if (action === "activate-version") {
        const version = requiredPositiveInteger(body.version, "version");
        const activated = await activatePromptVersion(promptKey, version, {
          actorUserId: parent.id,
          reason: "test_lab_explicit_activation",
          metadata: { source: "test_lab" },
        });
        return NextResponse.json({
          data: { activated, workspace: await getPromptWorkspace(promptKey) },
        });
      }

      if (action === "rollback") {
        const version = requiredPositiveInteger(body.version, "version");
        const activated = await rollbackPrompt(promptKey, version, {
          actorUserId: parent.id,
          reason: "test_lab_explicit_rollback",
          metadata: { source: "test_lab" },
        });
        return NextResponse.json({
          data: { activated, workspace: await getPromptWorkspace(promptKey) },
        });
      }

      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: `Unknown action: ${action}` },
        { status: 400 },
      );
    } catch (error) {
      return handleError(error);
    }
  });
}, "/api/settings/test-lab/prompts");

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`PROMPT_WORKSPACE_REQUIRED_FIELD:${field}`);
  }
  return value.trim();
}

function requiredPositiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`PROMPT_WORKSPACE_POSITIVE_INTEGER_REQUIRED:${field}`);
  }
  return value;
}

function asPromptDraftPatch(value: unknown): PromptDraftPatch {
  const object = asObject(value, "patch");
  const patch: PromptDraftPatch = {};

  if (object.systemTemplate !== undefined) {
    patch.systemTemplate = requiredString(
      object.systemTemplate,
      "patch.systemTemplate",
    );
  }
  if (object.userTemplate !== undefined) {
    patch.userTemplate = requiredString(
      object.userTemplate,
      "patch.userTemplate",
    );
  }

  return patch;
}

function asPromptContext(
  value: unknown,
): Record<string, string | number | boolean | null | object> {
  const object = asObject(value, "context");
  const context: Record<string, string | number | boolean | null | object> = {};
  for (const [key, entry] of Object.entries(object)) {
    if (
      entry === null ||
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "boolean" ||
      (typeof entry === "object" && entry !== null)
    ) {
      context[key] = entry;
      continue;
    }
    throw new Error(`PROMPT_WORKSPACE_CONTEXT_VALUE_INVALID:${key}`);
  }
  return context;
}

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`PROMPT_WORKSPACE_OBJECT_REQUIRED:${field}`);
  }
  return value as Record<string, unknown>;
}

function handleError(error: unknown): NextResponse {
  const err = error as Error & { name?: string };
  const message = err.message ?? "Unknown error";
  if (
    err.name === "AuthorizationError" ||
    message.includes("not a member") ||
    message.includes("FORBIDDEN")
  ) {
    return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
  }
  return NextResponse.json(
    { error: "PROMPT_WORKSPACE_ERROR", message },
    { status: 400 },
  );
}
