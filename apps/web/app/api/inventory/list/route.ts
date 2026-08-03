import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { listInventory } from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const GET = observeHandler(
  (request: Request) => {
    return withParent(async (parent) => {
      const { searchParams } = new URL(request.url);
      const householdId = searchParams.get("householdId");
      const ownerType = searchParams.get("ownerType");
      const ownerId = searchParams.get("ownerId");

      if (!householdId) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "householdId query parameter is required" },
          { status: 400 },
        );
      }

      if (!ownerType || !ownerId) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "ownerType and ownerId query parameters are required" },
          { status: 400 },
        );
      }

      try {
        const items = await listInventory(parent.id, householdId, ownerType, ownerId);
        return NextResponse.json({ items });
      } catch (error) {
        const err = error as Error & { code?: string };
        const message = err.message ?? "Unknown error";
        if (err.name === "AuthorizationError" || message.includes("not a member")) {
          return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
        }
        return NextResponse.json(
          { error: "INTERNAL_ERROR", message: "Failed to list inventory" },
          { status: 500 },
        );
      }
    });
  },
  "/api/inventory/list",
);
