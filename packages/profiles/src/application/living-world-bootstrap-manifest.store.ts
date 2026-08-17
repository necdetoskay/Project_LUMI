import { and, eq } from "drizzle-orm";

import { characterFoundations } from "../db/schema/profile";
import {
  validateCharacterFoundation,
  type CharacterFoundationRecord,
  type LivingWorldBootstrapManifest,
} from "../domain/character-genesis";
import { getProfileDb } from "./db";
import type { LivingWorldBootstrapManifestStore } from "./living-world-bootstrap.service";

export class DrizzleLivingWorldBootstrapManifestStore
  implements LivingWorldBootstrapManifestStore
{
  async save(
    foundation: CharacterFoundationRecord,
    manifest: LivingWorldBootstrapManifest,
  ): Promise<void> {
    const nextFoundation: CharacterFoundationRecord = {
      ...foundation,
      bootstrapManifest: manifest,
      updatedAt: manifest.updatedAt,
    };
    validateCharacterFoundation(nextFoundation);

    const db = getProfileDb();
    const updated = await db
      .update(characterFoundations)
      .set({
        foundation: nextFoundation,
        bootstrapStatus: manifest.status,
        bootstrapRunId: manifest.idempotencyKey,
        updatedAt: manifest.updatedAt,
      })
      .where(
        and(
          eq(characterFoundations.characterId, foundation.characterId),
          eq(characterFoundations.householdId, foundation.householdId),
          eq(characterFoundations.childProfileId, foundation.childProfileId),
          eq(characterFoundations.bootstrapRunId, manifest.idempotencyKey),
        ),
      )
      .returning({ characterId: characterFoundations.characterId });

    if (updated.length === 0) {
      throw new Error("LIVING_WORLD_BOOTSTRAP_MANIFEST_PERSIST_FAILED");
    }
  }
}
