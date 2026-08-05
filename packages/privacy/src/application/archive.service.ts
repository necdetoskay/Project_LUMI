import { appendLifecycleAudit } from "./lifecycle-audit.service";
import { NotFoundError } from "../domain/errors";
import {
  archiveChildProfile,
  findChildProfileForUser,
  listCharactersByChildProfile,
} from "@lumi/profiles/application";
import {
  archiveWorld,
  getWorldForCharacter,
} from "@lumi/world/application";

export interface ArchiveChildDataResult {
  childProfileId: string;
  householdId: string;
  archivedCharacters: number;
  archivedWorlds: number;
}

export async function archiveChildData(
  userId: string,
  householdId: string,
  childProfileId: string,
): Promise<ArchiveChildDataResult> {
  const profile = await findChildProfileForUser(
    childProfileId,
    userId,
    householdId,
  );
  if (!profile) {
    throw new NotFoundError("ChildProfile", childProfileId);
  }

  const characters = await listCharactersByChildProfile(
    userId,
    householdId,
    childProfileId,
  );

  let archivedWorlds = 0;
  for (const character of characters) {
    const world = await getWorldForCharacter(character.id);
    if (world) {
      await archiveWorld(world.id);
      archivedWorlds += 1;
    }
  }

  await archiveChildProfile(userId, childProfileId, householdId);

  await appendLifecycleAudit({
    householdId,
    actorId: userId,
    action: "archive.child_data",
    subjectType: "child_profile",
    subjectId: childProfileId,
    beforeState: {},
    afterState: {
      archivedCharacters: characters.length,
      archivedWorlds,
    },
  });

  return {
    childProfileId,
    householdId,
    archivedCharacters: characters.length,
    archivedWorlds,
  };
}
