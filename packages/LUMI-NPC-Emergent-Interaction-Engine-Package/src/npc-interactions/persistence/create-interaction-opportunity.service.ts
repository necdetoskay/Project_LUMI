import type { QueryExecutor } from "../../db/transaction";
import {
  interactionOpportunities,
  interactionParticipants,
} from "../../db/schema";
import type { NpcInteractionCandidate } from "../types";

export async function createInteractionOpportunity(
  tx: QueryExecutor,
  candidate: NpcInteractionCandidate,
) {
  const [opportunity] = await tx
    .insert(interactionOpportunities)
    .values({
      worldId: candidate.worldId,
      childProfileId: candidate.childProfileId,
      sourceCharacterId:
        candidate.sourceCharacterId,
      targetCharacterId:
        candidate.targetCharacterId,
      interactionType:
        candidate.interactionType,
      title: candidate.title,
      summary: candidate.summary,
      payload: candidate.payload,
      utilityScore: candidate.utility,
      urgencyScore: candidate.urgency,
      relationshipScore:
        candidate.relationshipScore,
      noveltyScore:
        candidate.noveltyScore,
      safetyScore:
        candidate.safetyScore,
      status: "pending",
      expiresAt: candidate.expiresAt,
    })
    .returning();

  if (!opportunity) {
    throw new Error(
      "Interaction opportunity could not be created",
    );
  }

  await tx
    .insert(interactionParticipants)
    .values({
      interactionOpportunityId:
        opportunity.id,
      characterId:
        candidate.sourceCharacterId,
      participantRole: "source",
    });

  if (candidate.targetCharacterId) {
    await tx
      .insert(interactionParticipants)
      .values({
        interactionOpportunityId:
          opportunity.id,
        characterId:
          candidate.targetCharacterId,
        participantRole: "target",
      });
  }

  return opportunity;
}
