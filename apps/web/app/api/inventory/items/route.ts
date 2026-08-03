import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { acquireItem } from "@lumi/profiles/application";
import type { ItemInstanceCreateInput } from "@lumi/profiles/domain";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const POST = observeHandler(
  (request: Request) => {
    return withParent(async (parent) => {
      const { searchParams } = new URL(request.url);
      const householdId = searchParams.get("householdId");

      if (!householdId) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "householdId query parameter is required" },
          { status: 400 },
        );
      }

      try {
        const body = (await request.json()) as Record<string, unknown>;
        if (!body.definitionKey || !body.targetOwnerType || !body.targetOwnerId) {
          return NextResponse.json(
            { error: "VALIDATION_ERROR", message: "definitionKey, targetOwnerType, and targetOwnerId are required" },
            { status: 400 },
          );
        }

        const result = await acquireItem(
          parent.id,
          householdId,
          body.definitionKey as string,
          body.targetOwnerType as string,
          body.targetOwnerId as string,
          body.input as ItemInstanceCreateInput | undefined,
          body.idempotencyKey as string | undefined,
        );
        return NextResponse.json({ item: result.instance }, { status: 201 });
      } catch (error) {
        const err = error as Error & { code?: string };
        const message = err.message ?? "Unknown error";
        if (err.name === "AuthorizationError" || message.includes("not a member")) {
          return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
        }
        if (err.name === "ValidationError") {
          return NextResponse.json({ error: err.code ?? "VALIDATION_ERROR", message }, { status: 400 });
        }
        if (err.name === "NotFoundError") {
          return NextResponse.json({ error: "NOT_FOUND", message }, { status: 404 });
        }
        if (err.name === "DomainError") {
          return NextResponse.json({ error: err.code ?? "CONFLICT", message }, { status: 409 });
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to acquire item" },
          { status: 500 },
        );
      }
    });
  },
  "/api/inventory/items",
);
