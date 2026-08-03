import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { createItemDefinition } from "@lumi/profiles/application";
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
        if (!body.definitionKey || !body.displayName || !body.category) {
          return NextResponse.json(
            { error: "VALIDATION_ERROR", message: "definitionKey, displayName, and category are required" },
            { status: 400 },
          );
        }

        const result = await createItemDefinition(parent.id, householdId, body as never);
        return NextResponse.json({ definition: result }, { status: 201 });
      } catch (error) {
        const err = error as Error & { code?: string };
        const message = err.message ?? "Unknown error";
        if (err.name === "AuthorizationError" || message.includes("not a member")) {
          return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
        }
        if (err.name === "ValidationError") {
          return NextResponse.json({ error: err.code ?? "VALIDATION_ERROR", message }, { status: 400 });
        }
        if (err.name === "DomainError" && err.code === "DEFINITION_KEY_EXISTS") {
          return NextResponse.json({ error: "CONFLICT", message }, { status: 409 });
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to create item definition" },
          { status: 500 },
        );
      }
    });
  },
  "/api/inventory/definitions",
);
