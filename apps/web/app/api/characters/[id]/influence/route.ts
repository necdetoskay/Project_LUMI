import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { upsertInfluence } from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const PATCH = observeHandler(
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
        const body = (await request.json()) as Record<string, number>;
        if (!body || typeof body !== "object") {
          return NextResponse.json(
            {
              error: "VALIDATION_ERROR",
              message: "Influence vector object is required",
            },
            { status: 400 },
          );
        }

        const result = await upsertInfluence(parent.id, householdId, id, body);
        return NextResponse.json({ character: result });
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
        if (err.name === "DomainError" && err.code === "VERSION_CONFLICT") {
          return NextResponse.json(
            { error: "VERSION_CONFLICT", message },
            { status: 409 },
          );
        }
        if (err.name === "ValidationError") {
          return NextResponse.json(
            { error: err.code ?? "VALIDATION_ERROR", message },
            { status: 400 },
          );
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to update influence" },
          { status: 500 },
        );
      }
    });
  },
  "/api/characters/{id}/influence",
);
