import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { transferItem } from "@lumi/profiles/application";
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
        const body = (await request.json()) as Record<string, unknown>;
        if (
          !body.fromOwnerType ||
          !body.fromOwnerId ||
          !body.toOwnerType ||
          !body.toOwnerId
        ) {
          return NextResponse.json(
            {
              error: "VALIDATION_ERROR",
              message:
                "fromOwnerType, fromOwnerId, toOwnerType, toOwnerId are required",
            },
            { status: 400 },
          );
        }

        const result = await transferItem(
          parent.id,
          householdId,
          id,
          body.fromOwnerType as string,
          body.fromOwnerId as string,
          body.toOwnerType as string,
          body.toOwnerId as string,
          (body.transferType as string) ?? "gift",
          body.reason as string | undefined,
          body.idempotencyKey as string | undefined,
        );

        if (!result) {
          return NextResponse.json(
            { error: "IDEMPOTENT", message: "Transfer already processed" },
            { status: 200 },
          );
        }

        return NextResponse.json({
          fromOwnership: result.fromOwnership,
          toOwnership: result.toOwnership,
          event: result.event,
        });
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
        if (err.name === "ValidationError") {
          return NextResponse.json(
            { error: err.code ?? "VALIDATION_ERROR", message },
            { status: 400 },
          );
        }
        if (err.name === "NotFoundError") {
          return NextResponse.json(
            { error: "NOT_FOUND", message },
            { status: 404 },
          );
        }
        if (err.name === "DomainError") {
          return NextResponse.json(
            { error: err.code ?? "CONFLICT", message },
            { status: 409 },
          );
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to transfer item" },
          { status: 500 },
        );
      }
    });
  },
  "/api/inventory/items/{id}/transfer",
);
