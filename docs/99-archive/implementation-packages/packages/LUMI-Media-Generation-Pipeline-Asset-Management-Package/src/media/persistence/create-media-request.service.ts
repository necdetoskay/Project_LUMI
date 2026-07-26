import type { QueryExecutor } from "../../db/transaction";
import {
  mediaRequests,
} from "../../db/schema";

export async function createMediaRequest(
  tx: QueryExecutor,
  input: {
    worldId: string;
    storyId?: string;
    storyNodeId?: string;
    characterId?: string;
    childProfileId?: string;
    mediaType: "image" | "audio";
    purpose: string;
    promptTemplateCode: string;
    promptVariables: Record<string, unknown>;
    estimatedCostTry: number;
    requiresApproval: boolean;
  },
) {
  const [request] = await tx
    .insert(mediaRequests)
    .values({
      worldId: input.worldId,
      storyId: input.storyId,
      storyNodeId: input.storyNodeId,
      characterId: input.characterId,
      childProfileId:
        input.childProfileId,
      mediaType: input.mediaType,
      purpose: input.purpose,
      promptTemplateCode:
        input.promptTemplateCode,
      promptVariables:
        input.promptVariables,
      estimatedCostTry:
        input.estimatedCostTry,
      status: input.requiresApproval
        ? "pending"
        : "approved",
      requiresApproval:
        input.requiresApproval,
    })
    .returning();

  if (!request) {
    throw new Error(
      "Media request could not be created",
    );
  }

  return request;
}
