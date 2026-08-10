import { describe, expect, it } from "vitest";

import {
  generateManagedImageCandidates,
  listImageGenerationCostEvents,
  type ImageGenerationBinaryStoragePort,
  type ImageGenerationProviderPort,
  type ManagedAssetAuthorizationPort,
} from "@lumi/profiles/application";

const USER_ID = "51000000-0000-4000-8000-000000000009";
const HOUSEHOLD_ID = "51000000-0000-4000-8000-000000000001";
const describeS56 =
  process.env.ULTEF_S56_IMAGE_ENABLE === "true" ? describe : describe.skip;

class AllowListedAuthorization implements ManagedAssetAuthorizationPort {
  async assertCanManage(
    input: Parameters<ManagedAssetAuthorizationPort["assertCanManage"]>[0],
  ) {
    if (input.userId !== USER_ID || input.householdId !== HOUSEHOLD_ID) {
      throw new Error("MANAGED_ASSET_FORBIDDEN");
    }
  }
}

class FakeImageProvider implements ImageGenerationProviderPort {
  readonly capabilities = [
    {
      provider: "fake-s56",
      model: "fake-image-v1",
      supportedAspectRatios: ["1:1" as const],
      supportedResolutions: ["1K" as const],
      maxImagesPerRequest: 1,
      supportsNativeBatch: false,
      supportsGrid: true,
      maxGridCells: 4,
      pricing: {
        currency: "USD" as const,
        perProviderRequestUsd: 0.01,
        pricingBasis: "ultef-s56-fixture",
      },
    },
  ];

  calls = 0;
  lastStrategy: string | null = null;

  async generate(
    request: Parameters<ImageGenerationProviderPort["generate"]>[0],
  ) {
    this.calls += 1;
    this.lastStrategy = request.strategy;
    return {
      provider: "fake-s56",
      model: request.model,
      providerRequestId: `fake-s56-${request.jobId}`,
      images: Array.from({ length: request.candidateCount }, (_, index) => ({
        index,
        bytesBase64: Buffer.from(`s56-image-${index}`).toString("base64"),
        mimeType: "image/png",
        width: 1024,
        height: 1024,
      })),
      actualCostUsd: 0.01 * request.candidateCount,
      costMetadata: { currency: "USD", source: "fake-s56" },
    };
  }
}

class FakeManagedStorage implements ImageGenerationBinaryStoragePort {
  async store(input: Parameters<ImageGenerationBinaryStoragePort["store"]>[0]) {
    return {
      storageRef: `fake://s56/${input.householdId}/${input.subjectType}/${input.subjectId}/${input.jobId}/${input.candidateIndex}.png`,
    };
  }
}

const authorizationPort = new AllowListedAuthorization();
const budgetPolicy = {
  runtimeMaxJobCostUsd: 0.1,
  liveTestMaxJobCostUsd: 0.02,
  minimumGridSavingsRatio: 0.2,
  allowUnknownPricing: false,
};

describeS56("PX-LUMI-S56 image generation platform", () => {
  it("persists an idempotent generic generation job, candidates and cost ledger", async () => {
    const provider = new FakeImageProvider();
    const subjectId = crypto.randomUUID();
    const idempotencyKey = `s56-${crypto.randomUUID()}`;
    const input = {
      householdId: HOUSEHOLD_ID,
      subjectType: "npc" as const,
      subjectId,
      assetKind: "npc_portrait",
      idempotencyKey,
      prompt: "Friendly child-safe fox guide portrait",
      candidateCount: 2,
      aspectRatio: "1:1" as const,
      requestMaxCostUsd: 0.1,
      preferredProvider: "fake-s56",
      preferredModel: "fake-image-v1",
    };
    const deps = {
      authorizationPort,
      providers: [provider],
      storagePort: new FakeManagedStorage(),
      budgetPolicy,
    };

    const first = await generateManagedImageCandidates(USER_ID, input, deps);
    expect(first.replayed).toBe(false);
    expect(first.job.status).toBe("succeeded");
    expect(first.job.strategy).toBe("direct");
    expect(Number(first.job.estimatedCostUsd)).toBe(0.02);
    expect(Number(first.job.actualCostUsd)).toBe(0.02);
    expect(first.candidates).toHaveLength(2);
    expect(
      first.candidates.every(
        (asset) =>
          asset.subjectType === "npc" &&
          asset.subjectId === subjectId &&
          asset.sourceSystem === "image_generation" &&
          asset.sourceAssetId === first.job.id &&
          asset.lifecycleState === "candidate",
      ),
    ).toBe(true);
    expect(provider.calls).toBe(1);

    const costs = await listImageGenerationCostEvents(
      HOUSEHOLD_ID,
      first.job.id,
    );
    expect(costs.map((event) => event.eventType)).toEqual([
      "estimated",
      "actual",
    ]);
    expect(costs.map((event) => Number(event.amountUsd))).toEqual([0.02, 0.02]);

    const replay = await generateManagedImageCandidates(USER_ID, input, deps);
    expect(replay.replayed).toBe(true);
    expect(replay.job.id).toBe(first.job.id);
    expect(replay.candidates).toHaveLength(2);
    expect(provider.calls).toBe(1);
  });

  it("rejects over-budget work before invoking a provider", async () => {
    const provider = new FakeImageProvider();
    await expect(
      generateManagedImageCandidates(
        USER_ID,
        {
          householdId: HOUSEHOLD_ID,
          subjectType: "location",
          subjectId: crypto.randomUUID(),
          assetKind: "location_establishing",
          idempotencyKey: `s56-budget-${crypto.randomUUID()}`,
          prompt: "Gentle enchanted forest establishing shot",
          candidateCount: 4,
          requestMaxCostUsd: 0.02,
          preferredProvider: "fake-s56",
          preferredModel: "fake-image-v1",
        },
        {
          authorizationPort,
          providers: [provider],
          storagePort: new FakeManagedStorage(),
          budgetPolicy,
        },
      ),
    ).rejects.toThrow("IMAGE_GENERATION_NO_ELIGIBLE_PLAN");
    expect(provider.calls).toBe(0);
  });

  it("falls back to direct generation when grid splitting is not composed", async () => {
    const provider = new FakeImageProvider();
    const result = await generateManagedImageCandidates(
      USER_ID,
      {
        householdId: HOUSEHOLD_ID,
        subjectType: "item",
        subjectId: crypto.randomUUID(),
        assetKind: "item_reference",
        idempotencyKey: `s56-grid-fallback-${crypto.randomUUID()}`,
        prompt: "A magical compass, isolated storybook item reference",
        candidateCount: 4,
        requestMaxCostUsd: 0.1,
        preferredProvider: "fake-s56",
        preferredModel: "fake-image-v1",
        allowGrid: true,
      },
      {
        authorizationPort,
        providers: [provider],
        storagePort: new FakeManagedStorage(),
        budgetPolicy,
      },
    );

    expect(result.job.strategy).toBe("direct");
    expect(provider.lastStrategy).toBe("direct");
    expect(result.candidates).toHaveLength(4);
  });
});
