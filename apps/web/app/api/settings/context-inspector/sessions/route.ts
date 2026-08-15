import { NextResponse } from "next/server";

import { withParent } from "@/lib/auth/with-parent";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { handleStoryError } from "@/lib/story-api/error";
import { getOwnedHousehold } from "@lumi/profiles/application";
import { listGenerationInspectionSessions } from "@lumi/story/application";

export const GET = observeHandler(async () => {
  return withParent(async (parent) => {
    const household = await getOwnedHousehold(parent.id);
    if (!household) {
      return NextResponse.json(
        {
          error: "NOT_FOUND",
          message: "Owned household was not found",
        },
        { status: 404 },
      );
    }

    try {
      const sessions = await listGenerationInspectionSessions({
        householdId: household.id,
      });
      return NextResponse.json({
        household: { id: household.id, name: household.name },
        sessions,
      });
    } catch (error) {
      return handleStoryError(
        error,
        "Failed to discover generation context inspection sessions",
      );
    }
  });
}, "/api/settings/context-inspector/sessions");
