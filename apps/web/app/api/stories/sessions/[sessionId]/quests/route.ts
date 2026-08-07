import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { getOwnedHousehold } from "@lumi/profiles/application";
import { getStorySessionOrForbidden } from "@lumi/story/application";
import { getQuestsBySessionId } from "@lumi/world/application";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { handleStoryError } from "@/lib/story-api/error";

const paramsSchema = z.object({
  sessionId: z.string().uuid(),
});

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Devam ediyor";
    case "paused":
      return "Bekliyor";
    case "completed":
      return "Tamamlandi";
    case "abandoned":
      return "Birakildi";
    case "inactive":
    default:
      return "Bekliyor";
  }
}

function objectiveLabel(status: string): string {
  switch (status) {
    case "completed":
      return "Tamamlandi";
    case "in_progress":
      return "Devam ediyor";
    case "unlocked":
      return "Acildi";
    case "skipped":
      return "Atlandi";
    case "locked":
    default:
      return "Kilitli";
  }
}

export const GET = observeHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ sessionId: string }> },
  ) => {
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

      const parsedParams = paramsSchema.safeParse(await params);
      if (!parsedParams.success) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: parsedParams.error.message },
          { status: 400 },
        );
      }

      const { sessionId } = parsedParams.data;

      const household = await getOwnedHousehold(parent.id);
      if (!household || household.id !== householdId) {
        return NextResponse.json(
          {
            error: "FORBIDDEN",
            message: "User does not have access to this household",
          },
          { status: 403 },
        );
      }

      try {
        await getStorySessionOrForbidden(sessionId, householdId);
        const quests = await getQuestsBySessionId(sessionId);
        return NextResponse.json({
          quests: quests.map((quest) => ({
            id: quest.id,
            title: quest.title,
            summary: quest.summary,
            status: quest.status,
            statusLabel: statusLabel(quest.status),
            objectives: quest.objectives.map((objective) => ({
              index: objective.index,
              title: objective.title,
              status: objective.status,
              statusLabel: objectiveLabel(objective.status),
            })),
          })),
        });
      } catch (error) {
        return handleStoryError(error, "Failed to load quest log");
      }
    });
  },
  "/api/stories/sessions/{sessionId}/quests",
);
