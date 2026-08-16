import { DrizzleCharacterRepository } from "../db/repositories/drizzle/drizzle-character.repository";
import { getProfileDb } from "./db";

export interface NpcContextIdentity {
  characterId: string;
  householdId: string;
  childProfileId: string;
  name: string;
  broadKind: string;
  characterType: string;
  subtype: string;
  originConcept: string;
  lifecycleStage: string;
}

export interface NpcContextIdentityQuery {
  characterIds: string[];
  householdId: string;
  childProfileId: string;
}

export async function findNpcContextIdentities(
  input: NpcContextIdentityQuery,
): Promise<NpcContextIdentity[]> {
  const repository = new DrizzleCharacterRepository(getProfileDb());
  const characterIds = [...new Set(input.characterIds)].slice(0, 50);
  const records = await Promise.all(
    characterIds.map((characterId) =>
      repository.findById(characterId, input.householdId),
    ),
  );

  return records.flatMap((record) => {
    if (!record) return [];
    if (record.childProfileId !== input.childProfileId) return [];
    if (record.characterSubtype !== "npc") return [];

    return [
      {
        characterId: record.id,
        householdId: record.householdId,
        childProfileId: record.childProfileId,
        name: record.name,
        broadKind: record.broadKind,
        characterType: record.characterType,
        subtype: record.subtype,
        originConcept: record.originConcept,
        lifecycleStage: record.lifecycleStage,
      },
    ];
  });
}

export const npcContextIdentityReader = {
  findNpcIdentities: findNpcContextIdentities,
};
