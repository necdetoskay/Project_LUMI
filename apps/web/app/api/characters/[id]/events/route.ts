import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { getCharacterEvents } from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const GET = observeHandler(
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
        const events = await getCharacterEvents(parent.id, householdId, id);
        return NextResponse.json({ events });
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
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to get character events" },
          { status: 500 },
        );
      }
    });
  },
  "/api/characters/{id}/events",
);
