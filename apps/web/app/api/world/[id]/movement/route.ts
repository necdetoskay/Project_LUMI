import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { getOwnedHousehold } from "@lumi/profiles/application";
import { moveCharacterToLocation, getCharacterCurrentLocation, getCharacterMovementHistory, assertWorldAccess } from "@lumi/world";

const moveBodySchema = z.object({
  characterId: z.string().uuid(),
  targetLocationId: z.string().uuid(),
  moveType: z.string().optional(),
});

export const POST = observeHandler(
  (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    return withParent(async (parent) => {
      const worldId = (await ctx.params).id;

      try {
        const raw = await readRequestBody(request);
        const parsed = moveBodySchema.safeParse(raw);

        if (!parsed.success) {
          return NextResponse.json(
            { error: "VALIDATION_ERROR", message: parsed.error.message },
            { status: 400 },
          );
        }

        const body = parsed.data;

        const household = await getOwnedHousehold(parent.id);
        if (!household) {
          return NextResponse.json({ error: "FORBIDDEN", message: "User does not own a household" }, { status: 403 });
        }

        await assertWorldAccess(worldId, household.id);

        const result = await moveCharacterToLocation({
          characterId: body.characterId,
          targetLocationId: body.targetLocationId,
          householdId: household.id,
          worldId,
          moveType: body.moveType as never,
        });

        return NextResponse.json({ movement: result }, { status: 201 });
      } catch (error) {
        const err = error as Error & { code?: string };
        const message = err.message ?? "Unknown error";
        if (err.name === "AuthorizationError" || message.includes("not a member")) {
          return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
        }
        if (err.name === "NotFoundError" || err.code === "NOT_FOUND") {
          return NextResponse.json({ error: "NOT_FOUND", message }, { status: 404 });
        }
        if (err.name === "ValidationError") {
          return NextResponse.json({ error: err.code ?? "VALIDATION_ERROR", message }, { status: 400 });
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to move character" },
          { status: 500 },
        );
      }
    });
  },
  "/api/world/{id}/movement",
);

export const GET = observeHandler(
  (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    return withParent(async (parent) => {
      const worldId = (await ctx.params).id;

      try {
        const household = await getOwnedHousehold(parent.id);
        if (!household) {
          return NextResponse.json({ error: "FORBIDDEN", message: "User does not own a household" }, { status: 403 });
        }

        await assertWorldAccess(worldId, household.id);

        const { searchParams } = new URL(request.url);
        const characterId = searchParams.get("characterId");

        if (!characterId) {
          return NextResponse.json(
            { error: "VALIDATION_ERROR", message: "characterId query parameter is required" },
            { status: 400 },
          );
        }

        const location = await getCharacterCurrentLocation(characterId);
        const history = await getCharacterMovementHistory(characterId);
        return NextResponse.json({ location, history });
      } catch (error) {
        const err = error as Error;
        if (err.name === "NotFoundError") {
          return NextResponse.json({ error: "NOT_FOUND", message: err.message }, { status: 404 });
        }
        if (err.name === "AuthorizationError") {
          return NextResponse.json({ error: "FORBIDDEN", message: err.message }, { status: 403 });
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: err.message ?? "Failed to get character location" },
          { status: 500 },
        );
      }
    });
  },
  "/api/world/{id}/movement",
);
