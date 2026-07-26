import { eq } from "drizzle-orm";
import { DrizzleStoryRepository } from "../../db/repositories/story/drizzle-story.repository";
import { storyParticipants } from "../../db/schema/story";
import { characters } from "../../db/schema/character";
import { withTransaction } from "../../db/transaction";

export async function startStorySession(input: {
  storyVersionId: string;
  childProfileId: string;
  participantCharacterIds: string[];
  currentLocationId?: string;
  startNodeKey?: string;
}) {
  return withTransaction(async (tx) => {
    const repository = new DrizzleStoryRepository(tx);

    const session = await repository.startSession({
      storyVersionId: input.storyVersionId,
      childProfileId: input.childProfileId,
      currentLocationId: input.currentLocationId,
      currentNodeKey: input.startNodeKey,
      status: "active",
    });

    for (const characterId of input.participantCharacterIds) {
      const [character] = await tx.select().from(characters)
        .where(eq(characters.id, characterId)).limit(1);

      if (!character) {
        throw new Error(`Participant character not found: ${characterId}`);
      }

      await tx.insert(storyParticipants).values({
        storySessionId: session.id,
        characterId,
        participationRole: character.characterType === "child_avatar" ? "protagonist" : "participant",
        snapshot: {
          name: character.name,
          characterType: character.characterType,
          currentLocationId: character.currentLocationId,
        },
      });
    }

    return session;
  });
}
