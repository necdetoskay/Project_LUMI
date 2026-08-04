import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import {
  getLlmSettings,
  upsertOpenRouterKey,
  deleteOpenRouterKey,
  upsertTaskModelSetting,
  testOpenRouterConnection,
} from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const GET = observeHandler((request: Request) => {
  return withParent(async (parent) => {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get("householdId");

    if (!householdId) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "householdId query parameter is required",
        },
        { status: 400 },
      );
    }

    try {
      const settings = await getLlmSettings(parent.id, householdId);
      return NextResponse.json({ data: settings });
    } catch (error) {
      return handleServiceError(error);
    }
  });
}, "/api/settings/llm");

export const PUT = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const body = await readRequestBody(request);
    const parsed = body as Record<string, unknown>;

    if (!parsed || typeof parsed.action !== "string") {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "action field is required" },
        { status: 400 },
      );
    }

    const householdId = parsed.householdId as string | undefined;

    if (!householdId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "householdId is required" },
        { status: 400 },
      );
    }

    try {
      if (parsed.action === "upsert-key") {
        if (typeof parsed.apiKey !== "string" || !parsed.apiKey.trim()) {
          return NextResponse.json(
            { error: "VALIDATION_ERROR", message: "apiKey is required" },
            { status: 400 },
          );
        }
        const settings = await upsertOpenRouterKey(
          parent.id,
          householdId,
          parsed.apiKey,
        );
        return NextResponse.json({ data: settings });
      }

      if (parsed.action === "upsert-task") {
        const result = await upsertTaskModelSetting(parent.id, {
          householdId,
          taskType: String(parsed.taskType ?? ""),
          modelId: String(parsed.modelId ?? ""),
          reasoningLevel: String(parsed.reasoningLevel ?? "medium"),
          temperature: Number(parsed.temperature ?? 0.8),
          maxOutputTokens: Number(parsed.maxOutputTokens ?? 1800),
          enabled: parsed.enabled !== false,
        });
        return NextResponse.json({ data: result });
      }

      if (parsed.action === "test-connection") {
        const result = await testOpenRouterConnection(parent.id, householdId);
        return NextResponse.json({ data: result });
      }

      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: `Unknown action: ${parsed.action}`,
        },
        { status: 400 },
      );
    } catch (error) {
      return handleServiceError(error);
    }
  });
}, "/api/settings/llm");

export const DELETE = observeHandler((request: Request) => {
  return withParent(async (parent) => {
    const body = await readRequestBody(request);
    const parsed = body as Record<string, unknown>;
    const householdId = parsed.householdId as string | undefined;

    if (!householdId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "householdId is required" },
        { status: 400 },
      );
    }

    try {
      const settings = await deleteOpenRouterKey(parent.id, householdId);
      return NextResponse.json({ data: settings });
    } catch (error) {
      return handleServiceError(error);
    }
  });
}, "/api/settings/llm");

function handleServiceError(error: unknown): NextResponse {
  const err = error as Error & { name?: string; code?: string };
  const message = err.message ?? "Unknown error";
  if (
    err.name === "AuthorizationError" ||
    message.includes("not a member") ||
    message.includes("FORBIDDEN")
  ) {
    return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
  }
  if (err.code === "ENCRYPTION_CONFIG_ERROR") {
    return NextResponse.json(
      {
        error: "ENCRYPTION_CONFIG_ERROR",
        message:
          "Sistem yapılandırma hatası. Şifreleme anahtarı eksik — lütfen sistem yöneticinize başvurun.",
      },
      { status: 500 },
    );
  }
  if (err.name === "ValidationError" || err.name === "DomainError") {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message },
      { status: 400 },
    );
  }
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message },
    { status: 500 },
  );
}
