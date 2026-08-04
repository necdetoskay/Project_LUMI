import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { getOwnedHousehold } from "@lumi/profiles/application";
import { getWorldById, assertWorldAccess } from "@lumi/world";
import { DrizzleWorldRepository } from "@lumi/world/db/repositories/drizzle/drizzle-world.repository";
import { getWorldDb } from "@lumi/world/db/client";
import type { Database } from "@lumi/world/db/client";

export const GET = observeHandler(
  (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    return withParent(async (parent) => {
      const worldId = (await ctx.params).id;

      try {
        const household = await getOwnedHousehold(parent.id);
        if (!household) {
          return NextResponse.json(
            { error: "FORBIDDEN", message: "User does not own a household" },
            { status: 403 },
          );
        }

        await assertWorldAccess(worldId, household.id);

        const world = await getWorldById(worldId);
        if (!world) {
          return NextResponse.json(
            {
              error: "NOT_FOUND",
              message: `World with id ${worldId} not found`,
            },
            { status: 404 },
          );
        }

        const { searchParams } = new URL(request.url);
        const regionId = searchParams.get("regionId");

        const db = getWorldDb() as unknown as Database;
        const repo = new DrizzleWorldRepository();

        const locations = regionId
          ? await repo.findLocationsByRegionId(db, regionId)
          : await repo.findLocationsByWorldId(db, worldId);

        return NextResponse.json({ locations });
      } catch (error) {
        const err = error as Error;
        if (err.name === "NotFoundError") {
          return NextResponse.json(
            { error: "NOT_FOUND", message: err.message },
            { status: 404 },
          );
        }
        if (err.name === "AuthorizationError") {
          return NextResponse.json(
            { error: "FORBIDDEN", message: err.message },
            { status: 403 },
          );
        }
        return NextResponse.json(
          {
            error: "INTERNAL_ERROR",
            message: err.message ?? "Failed to list locations",
          },
          { status: 500 },
        );
      }
    });
  },
  "/api/world/{id}/locations",
);
