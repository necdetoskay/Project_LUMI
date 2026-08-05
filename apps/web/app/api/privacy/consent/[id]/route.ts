import { NextResponse } from "next/server";

import { withParent } from "@/lib/auth/with-parent";
import { revokeConsentForHousehold } from "@lumi/privacy/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = observeHandler(
  async (request: Request, ctx: RouteContext) => {
    return withParent(async (parent) => {
      const { searchParams } = new URL(request.url);
      const householdId = searchParams.get("householdId");

      if (!householdId) {
        return NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            message: "householdId query parameter is required",
          },
          { status: 400 },
        );
      }

      const consentId = (await ctx.params).id;

      try {
        const consent = await revokeConsentForHousehold(
          parent.id,
          householdId,
          consentId,
        );
        return NextResponse.json({ consent });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (
          message.includes("not a member") ||
          message.includes("UNAUTHORIZED")
        ) {
          return NextResponse.json(
            { error: "FORBIDDEN", message },
            { status: 403 },
          );
        }
        if (message.includes("NOT_FOUND")) {
          return NextResponse.json(
            { error: "NOT_FOUND", message },
            { status: 404 },
          );
        }
        if (
          message.includes("CONSENT_ALREADY_REVOKED") ||
          message.includes("validation") ||
          message.includes("ValidationError")
        ) {
          return NextResponse.json(
            { error: "VALIDATION_ERROR", message },
            { status: 400 },
          );
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to revoke consent" },
          { status: 500 },
        );
      }
    });
  },
);
