import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { getCharacterBootstrapStatus } from "@lumi/profiles/application";

export async function GET(request: Request) {
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
      const status = await getCharacterBootstrapStatus(
        parent.id,
        householdId,
        childProfileId,
      );
      return NextResponse.json({ status });
    } catch (error) {
      const err = error as Error & { code?: string };
      const message = err.message ?? "Unknown error";
      if (err.name === "AuthorizationError" || message.includes("not a member")) {
        return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
      }
      if (err.name === "NotFoundError" || message.startsWith("Unknown profile")) {
        return NextResponse.json(
          { error: "NOT_FOUND", message },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to read bootstrap status" },
        { status: 500 },
      );
    }
  });
}
