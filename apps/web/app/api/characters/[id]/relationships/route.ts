import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { addRelationship } from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const POST = observeHandler(
  (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    return withParent(async (parent) => {
      const { searchParams } = new URL(request.url);
      const householdId = searchParams.get("householdId");
      const { id } = await ctx.params;

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
        const body = (await request.json()) as {
          targetCharacterId: string;
          trust?: number;
          affinity?: number;
          familiarity?: number;
          relationshipType?: string;
          customTypeLabel?: string;
        };

        if (!body.targetCharacterId) {
          return NextResponse.json(
            {
              error: "VALIDATION_ERROR",
              message: "targetCharacterId is required",
            },
            { status: 400 },
          );
        }

        const rel: Record<string, unknown> = {
          targetCharacterId: body.targetCharacterId,
          trust: body.trust ?? 0.5,
          affinity: body.affinity ?? 0.5,
          familiarity: body.familiarity ?? 0,
          relationshipType: body.relationshipType ?? "neutral",
        };
        if (body.customTypeLabel) {
          rel.customTypeLabel = body.customTypeLabel;
        }
        const result = await addRelationship(
          parent.id,
          householdId,
          id,
          rel as never,
        );
        return NextResponse.json({ character: result }, { status: 201 });
      } catch (error) {
        const err = error as Error & { code?: string };
        const message = err.message ?? "Unknown error";
        if (
          err.name === "AuthorizationError" ||
          message.includes("not a member")
        ) {
          return NextResponse.json(
            { error: "FORBIDDEN", message },
            { status: 403 },
          );
        }
        if (err.name === "NotFoundError" || err.code === "NOT_FOUND") {
          return NextResponse.json(
            { error: "NOT_FOUND", message: "Character not found" },
            { status: 404 },
          );
        }
        if (err.name === "ValidationError") {
          return NextResponse.json(
            { error: err.code ?? "VALIDATION_ERROR", message },
            { status: 400 },
          );
        }
        if (err.name === "DomainError" && err.code === "VERSION_CONFLICT") {
          return NextResponse.json(
            { error: "VERSION_CONFLICT", message },
            { status: 409 },
          );
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to add relationship" },
          { status: 500 },
        );
      }
    });
  },
  "/api/characters/{id}/relationships",
);
