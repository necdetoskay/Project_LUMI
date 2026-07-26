import { eq } from "drizzle-orm";
import { getAuthContext } from "@/api/auth/get-auth-context";
import { apiErrorResponse } from "@/api/http/errors";
import { createRequestId } from "@/api/http/request-id";
import { apiSuccess } from "@/api/http/respond";
import {
  interactionOpportunities,
  storyHooks,
} from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import { createStoryHookFromInteraction } from "@/npc-interactions/story-hooks/create-story-hook";

export async function POST(
  _request: Request,
  context: {
    params: Promise<{
      opportunityId: string;
    }>;
  },
) {
  const fallbackRequestId =
    createRequestId();

  try {
    const authContext =
      await getAuthContext();
    const { opportunityId } =
      await context.params;

    const result =
      await withTransaction(
        async (tx) => {
          const [opportunity] =
            await tx
              .select()
              .from(
                interactionOpportunities,
              )
              .where(
                eq(
                  interactionOpportunities.id,
                  opportunityId,
                ),
              )
              .limit(1);

          if (!opportunity) {
            throw new Error(
              "Interaction opportunity not found",
            );
          }

          const hook =
            createStoryHookFromInteraction(
              opportunity,
            );

          const [storyHook] =
            await tx
              .insert(storyHooks)
              .values({
                worldId:
                  opportunity.worldId,
                childProfileId:
                  opportunity.childProfileId,
                hookType:
                  hook.hookType,
                title: hook.title,
                premise:
                  hook.premise,
                sourceEntityType:
                  "interaction_opportunity",
                sourceEntityId:
                  opportunity.id,
                constraints:
                  hook.constraints,
                status: "ready",
              })
              .returning();

          await tx
            .update(
              interactionOpportunities,
            )
            .set({
              status: "accepted",
              acceptedAt:
                new Date(),
              acceptedByUserId:
                authContext.user.id,
            })
            .where(
              eq(
                interactionOpportunities.id,
                opportunityId,
              ),
            );

          return {
            opportunityId,
            storyHookId:
              storyHook?.id,
          };
        },
      );

    return apiSuccess(
      result,
      authContext.requestId,
    );
  } catch (error) {
    return apiErrorResponse(
      error,
      fallbackRequestId,
    );
  }
}
