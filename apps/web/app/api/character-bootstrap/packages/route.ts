import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { listOriginPackages } from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const GET = observeHandler(
  (request: Request) => {
    return withParent(async (parent) => {
      const { searchParams } = new URL(request.url);
      const householdId = searchParams.get("householdId");
      const childProfileId = searchParams.get("childProfileId");

      if (!householdId || !childProfileId) {
        return NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            message: "householdId and childProfileId query parameters are required",
          },
          { status: 400 },
        );
      }

      try {
        const packages = await listOriginPackages(
          parent.id,
          householdId,
          childProfileId,
        );
        return NextResponse.json({ packages });
      } catch (error) {
        const err = error as Error & { code?: string };
        const message = err.message ?? "Unknown error";
        if (err.name === "AuthorizationError" || message.includes("not a member")) {
          return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to list packages" },
          { status: 500 },
        );
      }
    });
  },
  "/api/character-bootstrap/packages"

);
