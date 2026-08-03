import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { getOwnedHousehold } from "@lumi/profiles/application";
import { getWorldDetail, archiveWorld, assertWorldAccess } from "@lumi/world";

const archiveBodySchema = z.object({
  action: z.literal("archive"),
});

export const GET = observeHandler(
  (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    return withParent(async (parent) => {
      const id = (await ctx.params).id;

      try {
        const household = await getOwnedHousehold(parent.id);
        if (!household) {
          return NextResponse.json({ error: "FORBIDDEN", message: "User does not own a household" }, { status: 403 });
        }

        await assertWorldAccess(id, household.id);

        const detail = await getWorldDetail(id);
        return NextResponse.json({ world: detail });
      } catch (error) {
        const err = error as Error;
        if (err.name === "NotFoundError") {
          return NextResponse.json({ error: "NOT_FOUND", message: err.message }, { status: 404 });
        }
        if (err.name === "AuthorizationError") {
          return NextResponse.json({ error: "FORBIDDEN", message: err.message }, { status: 403 });
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: err.message ?? "Failed to get world" },
          { status: 500 },
        );
      }
    });
  },
  "/api/world/{id}",
);

export const PATCH = observeHandler(
  (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    return withParent(async (parent) => {
      const id = (await ctx.params).id;

      try {
        const raw = await request.json();
        const parsed = archiveBodySchema.safeParse(raw);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "VALIDATION_ERROR", message: "Only 'archive' action is supported" },
            { status: 400 },
          );
        }

        const household = await getOwnedHousehold(parent.id);
        if (!household) {
          return NextResponse.json({ error: "FORBIDDEN", message: "User does not own a household" }, { status: 403 });
        }

        await assertWorldAccess(id, household.id);

        const result = await archiveWorld(id);
        return NextResponse.json({ world: result });
      } catch (error) {
        const err = error as Error & { code?: string };
        const message = err.message ?? "Unknown error";
        if (err.name === "NotFoundError") {
          return NextResponse.json({ error: "NOT_FOUND", message }, { status: 404 });
        }
        if (err.name === "AuthorizationError") {
          return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
        }
        if (err.name === "ValidationError") {
          return NextResponse.json({ error: err.code ?? "VALIDATION_ERROR", message }, { status: 400 });
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to update world" },
          { status: 500 },
        );
      }
    });
  },
  "/api/world/{id}",
);
