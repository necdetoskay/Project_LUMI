import { and, eq } from "drizzle-orm";

import type {
  GenerationContextSnapshotEnvelope,
  GenerationContextSnapshotStore,
} from "../../../application/generation-context-snapshot.service";
import { digestGenerationContextSnapshot } from "../../../application/generation-context-snapshot.service";
import type { GenerationContextSourceReplayReference } from "../../../application/generation-context-source";
import type { QueryExecutor } from "../../../db/client";
import { generationContextSnapshots } from "../../../db/schema/profile";

export class DrizzleGenerationContextSnapshotStore
  implements GenerationContextSnapshotStore
{
  constructor(private readonly db: QueryExecutor) {}

  async put(input: {
    digest: string;
    store: string;
    snapshotVersion: string;
    payload: GenerationContextSnapshotEnvelope;
  }): Promise<void> {
    const computedDigest = digestGenerationContextSnapshot(input.payload);
    if (computedDigest !== input.digest) {
      throw new Error("GENERATION_CONTEXT_SNAPSHOT_DIGEST_INVALID");
    }

    await this.db
      .insert(generationContextSnapshots)
      .values({
        digest: input.digest,
        store: input.store,
        snapshotVersion: input.snapshotVersion,
        payload: input.payload,
      })
      .onConflictDoNothing({ target: generationContextSnapshots.digest });

    const existing = await this.get({
      kind: "content_addressed_snapshot",
      store: input.store,
      snapshotDigest: input.digest,
      snapshotVersion: input.snapshotVersion,
    });
    if (!existing) {
      throw new Error("GENERATION_CONTEXT_SNAPSHOT_PERSISTENCE_FAILED");
    }
    if (digestGenerationContextSnapshot(existing) !== input.digest) {
      throw new Error("GENERATION_CONTEXT_SNAPSHOT_IMMUTABILITY_VIOLATION");
    }
  }

  async get(
    reference: GenerationContextSourceReplayReference,
  ): Promise<GenerationContextSnapshotEnvelope | null> {
    const [record] = await this.db
      .select({ payload: generationContextSnapshots.payload })
      .from(generationContextSnapshots)
      .where(
        and(
          eq(generationContextSnapshots.digest, reference.snapshotDigest),
          eq(generationContextSnapshots.store, reference.store),
          eq(
            generationContextSnapshots.snapshotVersion,
            reference.snapshotVersion,
          ),
        ),
      )
      .limit(1);
    return record?.payload ?? null;
  }
}
