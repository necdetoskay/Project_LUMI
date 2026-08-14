import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";
import {
  activatePromptVersion,
  clonePromptVersion,
  createPromptDraft,
  listPromptVersions,
  rollbackPrompt,
  type PromptDraftInput,
} from "@lumi/profiles/application";

export const GET = observeHandler((request: Request) => {
  return withParent(async () => {
    const promptKey = new URL(request.url).searchParams.get("promptKey");
    if (!promptKey) return validation("promptKey query parameter is required");
    try {
      return NextResponse.json({ data: await listPromptVersions(promptKey) });
    } catch (error) {
      return handleError(error);
    }
  });
}, "/api/settings/prompts");

export const POST = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const body = (await readRequestBody(request)) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const promptKey =
      typeof body.promptKey === "string" ? body.promptKey.trim() : "";
    if (!action || !promptKey)
      return validation("action and promptKey are required");
    const reason = typeof body.reason === "string" ? body.reason : null;
    const context = { actorUserId: parent.id, reason };

    try {
      if (action === "create-draft") {
        const draft = body.draft as PromptDraftInput | undefined;
        if (!draft || typeof draft !== "object")
          return validation("draft is required");
        return NextResponse.json({
          data: await createPromptDraft(promptKey, draft, context),
        });
      }
      const version = Number(body.version);
      if (!Number.isInteger(version) || version < 1)
        return validation("valid version is required");
      if (action === "clone") {
        return NextResponse.json({
          data: await clonePromptVersion(promptKey, version, context),
        });
      }
      if (action === "activate") {
        return NextResponse.json({
          data: await activatePromptVersion(promptKey, version, context),
        });
      }
      if (action === "rollback") {
        if (!reason?.trim()) return validation("reason is required for rollback");
        return NextResponse.json({
          data: await rollbackPrompt(promptKey, version, context),
        });
      }
      return validation(`Unknown action: ${action}`);
    } catch (error) {
      return handleError(error);
    }
  });
}, "/api/settings/prompts");

function validation(message: string) {
  return NextResponse.json(
    { error: "VALIDATION_ERROR", message },
    { status: 400 },
  );
}

function handleError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (message.startsWith("PROMPT_") || message.includes("VALIDATION")) {
    return validation(message);
  }
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message },
    { status: 500 },
  );
}
