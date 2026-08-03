import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { applyTraitDeltas } from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const PATCH = observeHandler(
  (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    return withParent(async (parent) => {
      const { searchParams } = new URL(request.url);
      const householdId = searchParams.get("householdId");
      const { id } = await ctx.params;

      if (!householdId) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "householdId query parameter is required" },
          { status: 400 },
        );
      }

      try {
        const body = (await request.json()) as { deltas: unknown[] };
        if (!Array.isArray(body.deltas) || body.deltas.length === 0) {
          return NextResponse.json(
            { error: "VALIDATION_ERROR", message: "deltas array is required" },
            { status: 400 },
          );
        }

        const result = await applyTraitDeltas(parent.id, householdId, id, body.deltas as never);
        return NextResponse.json({ character: result });
      } catch (error) {
        const err = error as Error & { code?: string };
        const message = err.message ?? "Unknown error";
        if (err.name === "NotFoundError" || err.code === "NOT_FOUND") {
          return NextResponse.json(
            { error: "NOT_FOUND", message: "Character not found" },
            { status: 404 },
          );
        }
        if (err.name === "AuthorizationError" || message.includes("not a member")) {
          return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
        }
        if (err.name === "NotFoundError" || err.code === "NOT_FOUND") {
          return NextResponse.json({ error: "NOT_FOUND", message: "Character not found" }, { status: 404 });
        }
        if (err.name === "ValidationError") {
          return NextResponse.json({ error: err.code ?? "VALIDATION_ERROR", message }, { status: 400 });
        }
        if (err.name === "DomainError" && err.code === "VERSION_CONFLICT") {
          return NextResponse.json({ error: "VERSION_CONFLICT", message }, { status: 409 });
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to update character traits" },
          { status: 500 },
        );
      }
    });
  },
  "/api/characters/{id}/traits",
);
