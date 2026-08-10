import { describe, expect, it } from "vitest";

import {
  generateCharacterVisualCandidates,
  getCharacterVisualCanon,
  listCharacterVisualCandidates,
  rejectCharacterVisualCandidate,
  selectCharacterVisualCanon,
  type CharacterVisualGenerationPort,
  type CharacterVisualStoragePort,
} from "@lumi/profiles/application";

const USER_ID = "51000000-0000-4000-8000-000000000009";
const HOUSEHOLD_ID = "51000000-0000-4000-8000-000000000001";
const CHARACTER_ID = "51000000-0000-4000-8000-000000000003";

class FakeVisualProvider implements CharacterVisualGenerationPort {
  calls = 0;

  async generate(
    request: Parameters<CharacterVisualGenerationPort["generate"]>[0],
  ) {
    this.calls += 1;
    return {
      provider: "fake-s53",
      model: request.model,
      providerRequestId: `fake-${request.jobId}`,
      candidates: Array.from({ length: request.candidateCount }, (_, index) => ({
        index,
        bytesBase64: Buffer.from(`fake-image-${index}`).toString("base64"),
        mimeType: "image/png",
        width: 1024,
        height: 1024,
      })),
      costMetadata: { currency: "USD", total: 0 },
    };
  }
}

class FailingVisualProvider implements CharacterVisualGenerationPort {
  async generate(): Promise<never> {
    throw new Error("FAKE_PROVIDER_FAILURE");
  }
}

class FakeStorage implements CharacterVisualStoragePort {
  async store(input: Parameters<CharacterVisualStoragePort["store"]>[0]) {
    return {
      storageRef: `fake://s53/${input.householdId}/${input.characterId}/${input.jobId}/${input.candidateIndex}.png`,
    };
  }
}

describe("PX-LUMI-S53 character visual canon", () => {
  it("persists candidates, replays idempotently and replaces canon with history", async () => {
    const provider = new FakeVisualProvider();
    const storage = new FakeStorage();
    const key = `s53-${crypto.randomUUID()}`;

    const first = await generateCharacterVisualCandidates(
      USER_ID,
      {
        householdId: HOUSEHOLD_ID,
        characterId: CHARACTER_ID,
        idempotencyKey: key,
        candidateCount: 2,
      },
      { generationPort: provider, storagePort: storage },
    );

    expect(first.replayed).toBe(false);
    expect(first.job.status).toBe("succeeded");
    expect(first.job.costMetadata).toEqual({ currency: "USD", total: 0 });
    expect(first.candidates).toHaveLength(2);
    expect(provider.calls).toBe(1);

    const replay = await generateCharacterVisualCandidates(
      USER_ID,
      {
        householdId: HOUSEHOLD_ID,
        characterId: CHARACTER_ID,
        idempotencyKey: key,
        candidateCount: 2,
      },
      { generationPort: provider, storagePort: storage },
    );
    expect(replay.replayed).toBe(true);
    expect(replay.candidates).toHaveLength(2);
    expect(provider.calls).toBe(1);

    const firstAsset = first.candidates[0]!;
    const secondAsset = first.candidates[1]!;
    const canonV1 = await selectCharacterVisualCanon(
      USER_ID,
      HOUSEHOLD_ID,
      CHARACTER_ID,
      firstAsset.id,
    );
    expect(canonV1?.selectedAssetId).toBe(firstAsset.id);
    expect(canonV1?.version).toBe(1);

    const sameCanonReplay = await selectCharacterVisualCanon(
      USER_ID,
      HOUSEHOLD_ID,
      CHARACTER_ID,
      firstAsset.id,
    );
    expect(sameCanonReplay?.version).toBe(1);

    const canonV2 = await selectCharacterVisualCanon(
      USER_ID,
      HOUSEHOLD_ID,
      CHARACTER_ID,
      secondAsset.id,
    );
    expect(canonV2?.selectedAssetId).toBe(secondAsset.id);
    expect(canonV2?.version).toBe(2);

    const assets = await listCharacterVisualCandidates(
      USER_ID,
      HOUSEHOLD_ID,
      CHARACTER_ID,
    );
    expect(
      assets.find((asset) => asset.id === firstAsset.id)?.lifecycleState,
    ).toBe("archived");
    expect(
      assets.find((asset) => asset.id === secondAsset.id)?.lifecycleState,
    ).toBe("canonical");

    await rejectCharacterVisualCandidate(
      USER_ID,
      HOUSEHOLD_ID,
      CHARACTER_ID,
      firstAsset.id,
    );
    const afterReject = await listCharacterVisualCandidates(
      USER_ID,
      HOUSEHOLD_ID,
      CHARACTER_ID,
    );
    expect(
      afterReject.find((asset) => asset.id === firstAsset.id)?.lifecycleState,
    ).toBe("rejected");

    const persistedCanon = await getCharacterVisualCanon(
      USER_ID,
      HOUSEHOLD_ID,
      CHARACTER_ID,
    );
    expect(persistedCanon?.selectedAssetId).toBe(secondAsset.id);

    await expect(
      listCharacterVisualCandidates(
        "52000000-0000-4000-8000-000000000099",
        HOUSEHOLD_ID,
        CHARACTER_ID,
      ),
    ).rejects.toThrow();
  });

  it("records provider failure without phantom assets", async () => {
    const storage = new FakeStorage();
    const key = `s53-failure-${crypto.randomUUID()}`;

    await expect(
      generateCharacterVisualCandidates(
        USER_ID,
        {
          householdId: HOUSEHOLD_ID,
          characterId: CHARACTER_ID,
          idempotencyKey: key,
        },
        { generationPort: new FailingVisualProvider(), storagePort: storage },
      ),
    ).rejects.toThrow("FAKE_PROVIDER_FAILURE");

    const replay = await generateCharacterVisualCandidates(
      USER_ID,
      {
        householdId: HOUSEHOLD_ID,
        characterId: CHARACTER_ID,
        idempotencyKey: key,
      },
      { generationPort: new FakeVisualProvider(), storagePort: storage },
    );
    expect(replay.replayed).toBe(true);
    expect(replay.job.status).toBe("failed");
    expect(replay.candidates).toHaveLength(0);
  });
});
