import { describe, expect, it } from "vitest";

import {
  archiveManagedAsset,
  generateCharacterVisualCandidates,
  getManagedAssetCanon,
  getManagedAssetLifecycleHistory,
  listManagedAssets,
  registerManagedAssetMetadata,
  rejectManagedAsset,
  selectCharacterVisualCanon,
  selectManagedAssetCanon,
  type CharacterVisualGenerationPort,
  type CharacterVisualStoragePort,
  type ManagedAssetAuthorizationPort,
} from "@lumi/profiles/application";

const USER_ID = "51000000-0000-4000-8000-000000000009";
const HOUSEHOLD_ID = "51000000-0000-4000-8000-000000000001";
const CHARACTER_ID = "51000000-0000-4000-8000-000000000003";
const describeS55 =
  process.env.ULTEF_S55_ASSET_ENABLE === "true" ? describe : describe.skip;

class AllowListedAssetAuthorization implements ManagedAssetAuthorizationPort {
  async assertCanManage(input: Parameters<ManagedAssetAuthorizationPort["assertCanManage"]>[0]) {
    if (input.userId !== USER_ID || input.householdId !== HOUSEHOLD_ID) {
      throw new Error("MANAGED_ASSET_FORBIDDEN");
    }
  }
}

class FakeVisualProvider implements CharacterVisualGenerationPort {
  async generate(
    request: Parameters<CharacterVisualGenerationPort["generate"]>[0],
  ) {
    return {
      provider: "fake-s55",
      model: request.model,
      providerRequestId: `fake-${request.jobId}`,
      candidates: Array.from(
        { length: request.candidateCount },
        (_, index) => ({
          index,
          bytesBase64: Buffer.from(`s55-image-${index}`).toString("base64"),
          mimeType: "image/png",
          width: 1024,
          height: 1024,
        }),
      ),
      costMetadata: { currency: "USD", total: 0 },
    };
  }
}

class FakeStorage implements CharacterVisualStoragePort {
  async store(input: Parameters<CharacterVisualStoragePort["store"]>[0]) {
    return {
      storageRef: `fake://s55/${input.householdId}/${input.characterId}/${input.jobId}/${input.candidateIndex}.png`,
    };
  }
}

const deps = { authorizationPort: new AllowListedAssetAuthorization() };

describeS55("PX-LUMI-S55 generic asset management core", () => {
  it("supports generic subject lifecycle with canon history and authorization", async () => {
    const subjectId = crypto.randomUUID();
    const scope = {
      householdId: HOUSEHOLD_ID,
      subjectType: "npc" as const,
      subjectId,
    };

    const first = await registerManagedAssetMetadata(
      USER_ID,
      {
        ...scope,
        assetKind: "npc_portrait",
        storageRef: `fake://generic/${subjectId}/first.png`,
        mimeType: "image/png",
        originType: "uploaded",
        provenance: { source: "s55-test" },
      },
      deps,
    );
    const second = await registerManagedAssetMetadata(
      USER_ID,
      {
        ...scope,
        assetKind: "npc_portrait",
        storageRef: `fake://generic/${subjectId}/second.png`,
        mimeType: "image/png",
        originType: "derived",
        sourceAssetId: first.id,
        provenance: { source: "s55-test", derivedFrom: first.id },
      },
      deps,
    );

    const canonV1 = await selectManagedAssetCanon(USER_ID, scope, first.id, deps);
    expect(canonV1?.selectedAssetId).toBe(first.id);
    expect(canonV1?.version).toBe(1);

    const canonV2 = await selectManagedAssetCanon(USER_ID, scope, second.id, deps);
    expect(canonV2?.selectedAssetId).toBe(second.id);
    expect(canonV2?.version).toBe(2);

    const listed = await listManagedAssets(USER_ID, scope, deps);
    expect(listed).toHaveLength(2);
    expect(listed.find((asset) => asset.id === first.id)?.lifecycleState).toBe(
      "archived",
    );
    expect(listed.find((asset) => asset.id === second.id)?.lifecycleState).toBe(
      "canonical",
    );

    const firstHistory = await getManagedAssetLifecycleHistory(
      USER_ID,
      scope,
      first.id,
      deps,
    );
    expect(firstHistory.map((event) => event.toState)).toEqual([
      "candidate",
      "canonical",
      "archived",
    ]);

    await rejectManagedAsset(USER_ID, scope, first.id, deps);
    const afterReject = await listManagedAssets(USER_ID, scope, deps);
    expect(
      afterReject.find((asset) => asset.id === first.id)?.lifecycleState,
    ).toBe("rejected");

    await expect(
      archiveManagedAsset(USER_ID, scope, second.id, deps),
    ).rejects.toThrow("CANNOT_ARCHIVE_ACTIVE_MANAGED_ASSET_CANON");

    await expect(
      listManagedAssets(
        "52000000-0000-4000-8000-000000000099",
        scope,
        deps,
      ),
    ).rejects.toThrow("MANAGED_ASSET_FORBIDDEN");
  });

  it("mirrors S53 character candidates and canon into the generic model", async () => {
    const key = `s55-character-${crypto.randomUUID()}`;
    const generated = await generateCharacterVisualCandidates(
      USER_ID,
      {
        householdId: HOUSEHOLD_ID,
        characterId: CHARACTER_ID,
        idempotencyKey: key,
        candidateCount: 2,
      },
      {
        generationPort: new FakeVisualProvider(),
        storagePort: new FakeStorage(),
      },
    );

    const scope = {
      householdId: HOUSEHOLD_ID,
      subjectType: "character" as const,
      subjectId: CHARACTER_ID,
    };
    const genericCandidates = await listManagedAssets(USER_ID, scope, deps);
    for (const candidate of generated.candidates) {
      const mirrored = genericCandidates.find((asset) => asset.id === candidate.id);
      expect(mirrored?.storageRef).toBe(candidate.storageRef);
      expect(mirrored?.sourceSystem).toBe("character_visual_assets");
    }

    const selected = generated.candidates[1]!;
    const legacyCanon = await selectCharacterVisualCanon(
      USER_ID,
      HOUSEHOLD_ID,
      CHARACTER_ID,
      selected.id,
    );
    expect(legacyCanon?.selectedAssetId).toBe(selected.id);

    const genericCanon = await getManagedAssetCanon(
      USER_ID,
      scope,
      "character_portrait",
      deps,
    );
    expect(genericCanon?.selectedAssetId).toBe(selected.id);
    expect(genericCanon?.version).toBe(legacyCanon?.version);
  });
});
