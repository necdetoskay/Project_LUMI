import type { CharacterFoundationRecord } from "../domain";

export type FoundationScope = {
  householdId: string;
  childProfileId: string;
  characterId: string;
  worldId: string;
};

export type SaveCharacterFoundationInput = {
  foundation: CharacterFoundationRecord;
  expectedVersion: number | null;
};

/**
 * Persistence boundary for the durable Character Genesis/Saga foundation.
 *
 * The foundation record is profile-owned. NPCs, relationships, world events,
 * rumors, inventory and opportunities referenced by a bootstrap manifest stay
 * in their existing canonical authorities and are never duplicated here.
 */
export interface CharacterFoundationRepository {
  findByScope(
    scope: FoundationScope,
  ): Promise<CharacterFoundationRecord | null>;

  save(input: SaveCharacterFoundationInput): Promise<CharacterFoundationRecord>;
}
