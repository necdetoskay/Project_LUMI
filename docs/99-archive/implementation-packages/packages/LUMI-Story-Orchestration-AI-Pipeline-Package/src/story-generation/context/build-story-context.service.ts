import { desc, eq, inArray } from "drizzle-orm";
import type { QueryExecutor } from "../../db/transaction";
import {
  characterConditions,
  characterEmotions,
  characterTraits,
  characters,
  childInterests,
  childPreferences,
  childProfiles,
  itemDefinitions,
  itemInstances,
  locations,
  memories,
  memoryRelevance,
  simulationEvents,
  worldStates,
  worlds,
} from "../../db/schema";
import type { StoryContext } from "./story-context.types";

export async function buildStoryContext(
  tx: QueryExecutor,
  input: {
    worldId: string;
    childProfileId: string;
    participantCharacterIds: string[];
    selectedItemInstanceId?: string;
  },
): Promise<StoryContext> {
  const [world] = await tx
    .select()
    .from(worlds)
    .where(eq(worlds.id, input.worldId))
    .limit(1);

  const [child] = await tx
    .select()
    .from(childProfiles)
    .where(eq(childProfiles.id, input.childProfileId))
    .limit(1);

  if (!world || !child) {
    throw new Error("Story context root records not found");
  }

  const [state] = await tx
    .select()
    .from(worldStates)
    .where(eq(worldStates.worldId, input.worldId))
    .orderBy(desc(worldStates.effectiveAt))
    .limit(1);

  const interests = await tx
    .select()
    .from(childInterests)
    .where(
      eq(
        childInterests.childProfileId,
        input.childProfileId,
      ),
    );

  const preferences = await tx
    .select()
    .from(childPreferences)
    .where(
      eq(
        childPreferences.childProfileId,
        input.childProfileId,
      ),
    );

  const participantRows = await tx
    .select()
    .from(characters)
    .where(
      inArray(
        characters.id,
        input.participantCharacterIds,
      ),
    );

  const traitRows = await tx
    .select()
    .from(characterTraits)
    .where(
      inArray(
        characterTraits.characterId,
        input.participantCharacterIds,
      ),
    );

  const emotionRows = await tx
    .select()
    .from(characterEmotions)
    .where(
      inArray(
        characterEmotions.characterId,
        input.participantCharacterIds,
      ),
    );

  const conditionRows = await tx
    .select()
    .from(characterConditions)
    .where(
      inArray(
        characterConditions.characterId,
        input.participantCharacterIds,
      ),
    );

  const primaryCharacter = participantRows[0];
  const [location] = primaryCharacter?.currentLocationId
    ? await tx
        .select()
        .from(locations)
        .where(
          eq(
            locations.id,
            primaryCharacter.currentLocationId,
          ),
        )
        .limit(1)
    : [];

  const relevantMemories = await tx
    .select({
      summary: memories.summary,
      relevance: memoryRelevance.score,
    })
    .from(memoryRelevance)
    .innerJoin(
      memories,
      eq(memoryRelevance.memoryId, memories.id),
    )
    .where(
      eq(
        memoryRelevance.contextEntityId,
        input.worldId,
      ),
    )
    .orderBy(desc(memoryRelevance.score))
    .limit(20);

  const currentEvents = await tx
    .select()
    .from(simulationEvents)
    .where(eq(simulationEvents.worldId, input.worldId))
    .orderBy(desc(simulationEvents.occurredAt))
    .limit(20);

  let selectedItem:
    | StoryContext["selectedItem"]
    | undefined;

  if (input.selectedItemInstanceId) {
    const [item] = await tx
      .select({
        id: itemInstances.id,
        name: itemDefinitions.name,
        properties: itemInstances.properties,
      })
      .from(itemInstances)
      .innerJoin(
        itemDefinitions,
        eq(
          itemInstances.itemDefinitionId,
          itemDefinitions.id,
        ),
      )
      .where(
        eq(
          itemInstances.id,
          input.selectedItemInstanceId,
        ),
      )
      .limit(1);

    selectedItem = item;
  }

  return {
    world: {
      id: world.id,
      name: world.name,
      currentState: state?.payload ?? {},
    },
    child: {
      id: child.id,
      name: child.name,
      ageBand: child.ageBand ?? undefined,
      interests: interests.map(
        (item) => item.interestCode,
      ),
      preferences: Object.fromEntries(
        preferences.map((item) => [
          item.preferenceKey,
          item.preferenceValue,
        ]),
      ),
    },
    participants: participantRows.map((participant) => ({
      id: participant.id,
      name: participant.name,
      traits: Object.fromEntries(
        traitRows
          .filter(
            (row) =>
              row.characterId === participant.id,
          )
          .map((row) => [
            row.traitDefinitionId,
            Number(row.value),
          ]),
      ),
      emotions: Object.fromEntries(
        emotionRows
          .filter(
            (row) =>
              row.characterId === participant.id,
          )
          .map((row) => [
            row.emotionDefinitionId,
            Number(row.intensity),
          ]),
      ),
      conditions: conditionRows
        .filter(
          (row) =>
            row.characterId === participant.id,
        )
        .map((row) => row.conditionType),
    })),
    location: location
      ? {
          id: location.id,
          name: location.name,
        }
      : undefined,
    selectedItem,
    relevantMemories: relevantMemories.map(
      (memory) => ({
        summary: memory.summary,
        relevance: Number(memory.relevance),
      }),
    ),
    currentEvents: currentEvents.map((event) => ({
      eventType: event.eventType,
      summary: event.summary,
    })),
  };
}
