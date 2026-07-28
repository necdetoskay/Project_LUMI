import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { listCharactersByHousehold } from "@lumi/profiles/application";

export async function GET(request: Request) {
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

    try {
      const characters = await listCharactersByHousehold(
        parent.id,
        householdId,
      );
      return NextResponse.json({ characters });
    } catch (error) {
      const err = error as Error & { code?: string };
      const message = err.message ?? "Unknown error";
      if (err.name === "AuthorizationError" || message.includes("not a member")) {
        return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
      }
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to list characters" },
        { status: 500 },
      );
    }
  });
}
