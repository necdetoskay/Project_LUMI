import { describe, expect, it } from "vitest";

import {
  generateCharacterVisualCandidates,
  listCharacterVisualCandidates,
  selectCharacterVisualCanon,
  deleteCharacterVisualVariant,
  type CharacterVisualGenerationPort,
  type CharacterVisualStoragePort,
  type CharacterVisualDerivativePort,
  type CharacterVisualVariant,
} from "@lumi/profiles/application";
import { getCharacterVisualPresentationAsset } from "@lumi/profiles/visual-presentation";

const USER_ID = "51000000-0000-4000-8000-000000000009";
const HOUSEHOLD_ID = "51000000-0000-4000-8000-000000000001";
const CHARACTER_ID = "51000000-0000-4000-8000-000000000003";
const describeVisualDelete =
  process.env.ULTEF_S53_VISUAL_ENABLE === "true" ? describe : describe.skip;

class FakeVisualProvider implements CharacterVisualGenerationPort {
  async generate(
    request: Parameters<CharacterVisualGenerationPort["generate"]>[0],
  ) {
    return {
      provider: "fake-visual-delete",
      model: request.model,
      providerRequestId: `fake-delete-${request.jobId}`,
      candidates: [
        {
          index: 0,
          bytesBase64: Buffer.from("fake-sheet").toString("base64"),
          mimeType: "image/png",
          width: 1050,
          height: 700,
        },
      ],
      costMetadata: { currency: "USD", total: 0 },
    };
  }
}

class FakeStorage implements CharacterVisualStoragePort {
  async store(input: Parameters<CharacterVisualStoragePort["store"]>[0]) {
    return {
      storageRef: `fake://visual-delete/${input.householdId}/${input.characterId}/${input.jobId}/${input.candidateIndex}${input.variantKey ? `-${input.variantKey}` : ""}.png`,
    };
  }
}

const VARIANTS: CharacterVisualVariant[] = [
  "body-front",
  "body-three-quarter",
  "body-side",
  "body-back",
  "head-front",
  "head-three-quarter",
  "head-side",
];

class FakeSplitter implements CharacterVisualDerivativePort {
  async splitReferenceSheet(
    _input: Parameters<CharacterVisualDerivativePort["splitReferenceSheet"]>[0],
  ) {
    void _input;
    return VARIANTS.map((variant, index) => ({
      variant,
      bytesBase64: Buffer.from(`part-${index}`).toString("base64"),
      mimeType: "image/png",
      width: 350,
      height: 350,
      crop: { left: 0, top: 0, width: 350, height: 350 },
    }));
  }
}

describeVisualDelete("character visual variant soft delete", () => {
  it("soft-deletes a variant and hides it from presentation", async () => {
    const key = `visual-delete-${crypto.randomUUID()}`;
    const result = await generateCharacterVisualCandidates(
      USER_ID,
      {
        householdId: HOUSEHOLD_ID,
        characterId: CHARACTER_ID,
        idempotencyKey: key,
        mode: "reference-sheet",
      },
      {
        generationPort: new FakeVisualProvider(),
        storagePort: new FakeStorage(),
        derivativePort: new FakeSplitter(),
      },
    );

    const sheet = result.candidates[0]!;
    await selectCharacterVisualCanon(
      USER_ID,
      HOUSEHOLD_ID,
      CHARACTER_ID,
      sheet.id,
    );

    const all = await listCharacterVisualCandidates(
      USER_ID,
      HOUSEHOLD_ID,
      CHARACTER_ID,
    );
    const headFront = all.find((asset) => asset.assetKind === "head-front");
    expect(headFront).toBeDefined();
    expect(headFront?.sourceCompositeAssetId).toBe(sheet.id);

    const deleted = await deleteCharacterVisualVariant(
      USER_ID,
      HOUSEHOLD_ID,
      CHARACTER_ID,
      headFront!.id,
    );
    expect(deleted).toBeDefined();
    expect(deleted!.lifecycleState).toBe("archived");
    expect(deleted!.deletedAt).toBeInstanceOf(Date);

    const presentation = await getCharacterVisualPresentationAsset(
      USER_ID,
      HOUSEHOLD_ID,
      CHARACTER_ID,
      "portrait_primary",
    );
    expect(presentation).toBeNull();
  });

  it("keeps other variants visible after one variant is deleted", async () => {
    const key = `visual-delete-keep-${crypto.randomUUID()}`;
    const result = await generateCharacterVisualCandidates(
      USER_ID,
      {
        householdId: HOUSEHOLD_ID,
        characterId: CHARACTER_ID,
        idempotencyKey: key,
        mode: "reference-sheet",
      },
      {
        generationPort: new FakeVisualProvider(),
        storagePort: new FakeStorage(),
        derivativePort: new FakeSplitter(),
      },
    );

    const sheet = result.candidates[0]!;
    await selectCharacterVisualCanon(
      USER_ID,
      HOUSEHOLD_ID,
      CHARACTER_ID,
      sheet.id,
    );

    const all = await listCharacterVisualCandidates(
      USER_ID,
      HOUSEHOLD_ID,
      CHARACTER_ID,
    );
    const bodyFront = all.find((asset) => asset.assetKind === "body-front");
    await deleteCharacterVisualVariant(
      USER_ID,
      HOUSEHOLD_ID,
      CHARACTER_ID,
      bodyFront!.id,
    );

    const presentation = await getCharacterVisualPresentationAsset(
      USER_ID,
      HOUSEHOLD_ID,
      CHARACTER_ID,
      "full_body_front",
    );
    expect(presentation).toBeNull();

    const portrait = await getCharacterVisualPresentationAsset(
      USER_ID,
      HOUSEHOLD_ID,
      CHARACTER_ID,
      "portrait_primary",
    );
    expect(portrait).not.toBeNull();
  });

  it("rejects deleting the source composite asset", async () => {
    const key = `visual-delete-source-${crypto.randomUUID()}`;
    const result = await generateCharacterVisualCandidates(
      USER_ID,
      {
        householdId: HOUSEHOLD_ID,
        characterId: CHARACTER_ID,
        idempotencyKey: key,
        mode: "reference-sheet",
      },
      {
        generationPort: new FakeVisualProvider(),
        storagePort: new FakeStorage(),
        derivativePort: new FakeSplitter(),
      },
    );

    const sheet = result.candidates[0]!;
    await expect(
      deleteCharacterVisualVariant(
        USER_ID,
        HOUSEHOLD_ID,
        CHARACTER_ID,
        sheet.id,
      ),
    ).rejects.toThrow("VISUAL_SOURCE_ASSET_NOT_DELETABLE");
  });
});
