import { NextResponse } from "next/server";

import {
  createPromptDraft,
  getPromptWorkspace,
  renderPromptVersion,
} from "@lumi/prompts";
import { getLlmSettings } from "@lumi/profiles/application";
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
    const promptKey = requiredString(searchParams.get("promptKey"), "promptKey");

    try {
      await getLlmSettings(parent.id, householdId);
      const workspace = await getPromptWorkspace(householdId, promptKey);
      return NextResponse.json({ data: workspace });
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

      if (action === "create-draft") {
        const promptKey = requiredString(body.promptKey, "promptKey");
        const templateBody = requiredString(body.templateBody, "templateBody");
        const draft = await createPromptDraft({
          householdId,
          promptKey,
          templateBody,
        });
        const workspace = await getPromptWorkspace(householdId, promptKey);
        return NextResponse.json({ data: { draft, workspace } });
      }

      if (action === "render-version") {
        const versionId = requiredString(body.versionId, "versionId");
        const values = asObject(body.values, "values");
        const rendered = await renderPromptVersion(versionId, values);
        return NextResponse.json({ data: rendered });
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
