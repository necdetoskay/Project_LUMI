import { describe, expect, it } from "vitest";

import type { AssembledGenerationContext } from "./generation-context-assembler";
import {
  digestGenerationContextSnapshot,
  materializeGenerationContextSnapshots,
  replayGenerationContextFromSnapshots,
  type GenerationContextSnapshotEnvelope,
  type GenerationContextSnapshotStore,
} from "./generation-context-snapshot.service";
import type { GenerationContextSourceReplayReference } from "./generation-context-source";

class MemorySnapshotStore implements GenerationContextSnapshotStore {
  readonly records = new Map<string, GenerationContextSnapshotEnvelope>();

  async put(input: {
    digest: string;
    store: string;
    snapshotVersion: string;
    payload: GenerationContextSnapshotEnvelope;
  }): Promise<void> {
    const existing = this.records.get(input.digest);
    if (existing && digestGenerationContextSnapshot(existing) !== input.digest) {
      throw new Error("snapshot collision");
    }
    this.records.set(input.digest, input.payload);
  }

  async get(
    reference: GenerationContextSourceReplayReference,
  ): Promise<GenerationContextSnapshotEnvelope | null> {
    return this.records.get(reference.snapshotDigest) ?? null;
  }
}

function context(): AssembledGenerationContext {
  return {
    profile: "character_onboarding",
    maxContextTokens: 3_600,
    estimatedTokens: 120,
    fingerprint: "pre-materialization",
    droppedSections: [],
    sections: [
      {
        section: "child_identity",
        priority: "required",
        maxTokens: 300,
        estimatedTokens: 20,
        value: { ageBand: "6-8", ageYears: 7, locale: "tr-TR" },
        provenance: {
          source: "profiles.child-profile",
          sourceId: "private-child-id",
          sourceVersion: "v1",
          revision: "private-revision",
          authority: "canonical",
          reason: "required",
          updatedAt: "2026-08-18T00:00:00.000Z",
        },
      },
      {
        section: "creation_direction",
        priority: "required",
        maxTokens: 200,
        estimatedTokens: 10,
        value: { startDirection: "world_first" },
        provenance: {
          source: "profiles.character-creation-cycle",
          sourceId: "private-cycle-id",
          sourceVersion: "v1",
          authority: "canonical",
          reason: "current_task",
        },
      },
    ],
  };
}

describe("generation context snapshot materialization", () => {
  it("creates deterministic content-addressed references without exposing private provenance", async () => {
    const store = new MemorySnapshotStore();
    const materialized = await materializeGenerationContextSnapshots(
      context(),
      store,
    );

    expect(materialized.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(store.records.size).toBe(2);
    const references = materialized.sections.map(
      (section) => section.provenance.replay,
    );
    expect(references.every(Boolean)).toBe(true);
    expect(JSON.stringify(references)).not.toContain("private-child-id");
    expect(JSON.stringify(references)).not.toContain("private-cycle-id");
    expect(JSON.stringify(references)).not.toContain("private-revision");
  });

  it("reconstructs the exact section values and provenance and verifies the context fingerprint", async () => {
    const store = new MemorySnapshotStore();
    const materialized = await materializeGenerationContextSnapshots(
      context(),
      store,
    );
    const replayed = await replayGenerationContextFromSnapshots(
      materialized,
      store,
    );

    expect(replayed.fingerprintMatches).toBe(true);
    expect(replayed.assembled).toEqual(materialized);
  });

  it("fails closed when an immutable snapshot is missing", async () => {
    const store = new MemorySnapshotStore();
    const materialized = await materializeGenerationContextSnapshots(
      context(),
      store,
    );
    const digest = materialized.sections[0]?.provenance.replay?.snapshotDigest;
    expect(digest).toBeDefined();
    store.records.delete(digest!);

    await expect(
      replayGenerationContextFromSnapshots(materialized, store),
    ).rejects.toThrow("GENERATION_CONTEXT_SNAPSHOT_MISSING:child_identity");
  });

  it("fails closed when stored content no longer matches its digest", async () => {
    const store = new MemorySnapshotStore();
    const materialized = await materializeGenerationContextSnapshots(
      context(),
      store,
    );
    const reference = materialized.sections[0]?.provenance.replay;
    expect(reference).toBeDefined();
    const existing = store.records.get(reference!.snapshotDigest)!;
    store.records.set(reference!.snapshotDigest, {
      ...existing,
      value: { ageBand: "tampered" },
    });

    await expect(
      replayGenerationContextFromSnapshots(materialized, store),
    ).rejects.toThrow("GENERATION_CONTEXT_SNAPSHOT_DIGEST_MISMATCH:child_identity");
  });

  it("does not advertise exact replay for compacted sections", async () => {
    const store = new MemorySnapshotStore();
    const input = context();
    const first = input.sections[0]!;
    const materialized = await materializeGenerationContextSnapshots(
      {
        ...input,
        sections: [
          {
            ...first,
            provenance: {
              ...first.provenance,
              compaction: {
                strategy: "tail-prune-v1",
                originalTokens: 40,
                compactedTokens: 20,
                removedItems: 1,
              },
            },
          },
          input.sections[1]!,
        ],
      },
      store,
    );

    expect(materialized.sections[0]?.provenance.replay).toBeUndefined();
    expect(materialized.sections[1]?.provenance.replay).toBeDefined();
    expect(store.records.size).toBe(1);
  });
});
