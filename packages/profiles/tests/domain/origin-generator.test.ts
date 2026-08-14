import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindByIdForUser = vi.hoisted(() => vi.fn());
const mockFindById = vi.hoisted(() => vi.fn());
const mockFindByHousehold = vi.hoisted(() => vi.fn());
const mockEnsureOriginPackagesPrompt = vi.hoisted(() => vi.fn());
const mockResolveActivePrompt = vi.hoisted(() => vi.fn());
const mockGenerateTextWithLlm = vi.hoisted(() => vi.fn());
const mockRecordAiGenerationTrace = vi.hoisted(() => vi.fn());

vi.mock("../../src/db", () => {
  function MockHouseholdRepo() {
    return { findByIdForUser: mockFindByIdForUser };
  }
  function MockChildRepo() {
    return { findById: mockFindById };
  }
  function MockPolicyRepo() {
    return { findByHousehold: mockFindByHousehold };
  }
  return {
    getProfileDb: () => ({}),
    DrizzleHouseholdRepository: MockHouseholdRepo,
    DrizzleChildProfileRepository: MockChildRepo,
    DrizzleParentPolicyRepository: MockPolicyRepo,
  };
});

vi.mock("../../src/application/prompt-bootstrap.service", () => ({
  ensureOriginPackagesPrompt: mockEnsureOriginPackagesPrompt,
}));

vi.mock("../../src/application/prompt-runtime.service", () => ({
  resolveActivePrompt: mockResolveActivePrompt,
}));

vi.mock("../../src/application/text-llm-gateway.service", () => ({
  generateTextWithLlm: mockGenerateTextWithLlm,
}));

vi.mock("../../src/application/ai-generation-trace.service", () => ({
  recordAiGenerationTrace: mockRecordAiGenerationTrace,
}));

import {
  generateOriginPackages,
  LlmGenerationError,
} from "../../src/application/llm-settings/origin-generator";

const TEST_USER_ID = "user-001";
const TEST_HOUSEHOLD_ID = "household-001";
const TEST_CHILD_PROFILE_ID = "child-001";

type PreviousBatch = { subtype: string; originConcept: string }[];

const outputSchema = {
  type: "object",
  required: ["packages"],
  properties: {
    packages: {
      type: "array",
      items: { type: "object" },
    },
  },
};

function packagePayload(
  broadKind: "human" | "fantasy" | "animal" | "robot",
  subtype: string,
  originConcept: string,
) {
  return {
    broadKind,
    characterType: "explorer",
    subtype,
    originConcept,
    startingRegionArchetype: `${subtype} bölgesi`,
    startingLocation: `${subtype} başlangıcı`,
    homeArchetype: `${subtype} evi`,
    nearbyNpcSeed: `${subtype} dostu`,
    firstMysterySeed: `${subtype} gizemi`,
    toneVector: ["wonder", "curiosity"],
    noveltyMarkers: [`${subtype} işareti`],
  };
}

function successfulPayload() {
  return {
    packages: [
      packagePayload(
        "human",
        "Ay Işığı Kütüphanecisi",
        "Geceleri ay ışığında kitap okuyan küçük bir kütüphaneci",
      ),
      packagePayload(
        "fantasy",
        "Bulut Tamircisi",
        "Bulutların üstünde uçan araçlarla bulutları onaran bir çocuk",
      ),
      packagePayload(
        "animal",
        "Zaman Bahçecisi",
        "Zamanın yavaş aktığı gizli bir bahçede yaşayan bir bahçıvan",
      ),
      packagePayload(
        "robot",
        "Yıldız Habercisi",
        "Yıldızlardan gelen mesajları çözen küçük bir robot",
      ),
    ],
  };
}

function freshPayload() {
  return {
    packages: [
      packagePayload(
        "human",
        "Mercan Haritacısı",
        "Renk değiştiren mercan yollarını çizerek kayıp koyları bulan genç bir haritacı",
      ),
      packagePayload(
        "fantasy",
        "Rüzgar Dokumacısı",
        "Uçan adalar arasında güvenli yollar açmak için rüzgar şeritleri ören bir gezgin",
      ),
      packagePayload(
        "animal",
        "Kutup Işığı İzleyicisi",
        "Buz ovalarında gökyüzündeki renkli işaretleri takip eden meraklı bir tilki",
      ),
      packagePayload(
        "robot",
        "Melodi Arşivcisi",
        "Unutulmuş şehirlerin seslerini toplayıp yeni melodilere dönüştüren küçük bir robot",
      ),
    ],
  };
}

function llmResponse(payload: unknown) {
  return {
    content: JSON.stringify(payload),
    provider: "openrouter",
    model: "test-model",
    promptTokens: 100,
    completionTokens: 200,
    totalTokens: 300,
    latencyMs: 25,
    cost: null,
  };
}

function setupValidProfileMocks() {
  mockFindByIdForUser.mockResolvedValue({
    id: TEST_HOUSEHOLD_ID,
    name: "Test Household",
  });
  mockFindById.mockResolvedValue({
    id: TEST_CHILD_PROFILE_ID,
    householdId: TEST_HOUSEHOLD_ID,
    ageBand: "6-8",
    locale: "tr-TR",
    deletedAt: null,
  });
  mockFindByHousehold.mockResolvedValue({
    contentBoundary: "moderate",
    requireParentApprovalForAi: false,
  });
}

function setupPromptRuntimeMock() {
  mockEnsureOriginPackagesPrompt.mockResolvedValue(undefined);
  mockResolveActivePrompt.mockResolvedValue({
    promptKey: "character_onboarding.origin_packages",
    promptVersion: 1,
    system: "system prompt",
    user: "user prompt",
    outputSchema,
    schemaVersion: 1,
    providerOverride: null,
    modelOverride: null,
    generationConfig: { temperature: 0.85, maxOutputTokens: 1800 },
  });
}

function setupLlmSuccess() {
  mockGenerateTextWithLlm.mockResolvedValue(llmResponse(successfulPayload()));
}

async function generate(
  characterType = "explorer",
  previousBatch?: PreviousBatch,
) {
  return generateOriginPackages(
    TEST_USER_ID,
    TEST_HOUSEHOLD_ID,
    TEST_CHILD_PROFILE_ID,
    characterType,
    "auto",
    { interests: ["uzay", "kitap"] },
    previousBatch,
  );
}

describe("origin-generator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupValidProfileMocks();
    setupPromptRuntimeMock();
    setupLlmSuccess();
    mockRecordAiGenerationTrace.mockResolvedValue(undefined);
  });

  it("generates four validated origin packages through the prompt runtime", async () => {
    const result = await generate();

    expect(result.source).toBe("llm");
    expect(result.modelId).toBe("test-model");
    expect(result.candidates).toHaveLength(4);
    expect(result.candidates.map((candidate) => candidate.subtype)).toEqual([
      "Ay Işığı Kütüphanecisi",
      "Bulut Tamircisi",
      "Zaman Bahçecisi",
      "Yıldız Habercisi",
    ]);
  });

  it("bootstraps and resolves the active origin prompt before generation", async () => {
    await generate("inventor");

    expect(mockEnsureOriginPackagesPrompt).toHaveBeenCalledTimes(1);
    expect(mockResolveActivePrompt).toHaveBeenCalledTimes(1);
    expect(mockResolveActivePrompt).toHaveBeenCalledWith(
      "character_onboarding.origin_packages",
      expect.objectContaining({
        characterType: "inventor",
        originMode: "auto",
        packageCount: 4,
        ageBand: "6-8",
        locale: "tr-TR",
        preferenceHints: { interests: ["uzay", "kitap"] },
        contentBoundary: "moderate",
        requireParentApprovalForAi: false,
      }),
    );
  });

  it("passes the resolved prompt to the shared text LLM gateway", async () => {
    await generate();

    expect(mockGenerateTextWithLlm).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      householdId: TEST_HOUSEHOLD_ID,
      taskType: "character_origin_generation",
      system: "system prompt",
      user: "user prompt",
      modelOverride: null,
      generationConfig: { temperature: 0.85, maxOutputTokens: 1800 },
    });
  });

  it("records a valid generation trace", async () => {
    await generate();

    expect(mockRecordAiGenerationTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: TEST_HOUSEHOLD_ID,
        childProfileId: TEST_CHILD_PROFILE_ID,
        taskType: "character_origin_generation",
        promptKey: "character_onboarding.origin_packages",
        promptVersion: 1,
        validationStatus: "valid",
      }),
    );
  });

  it("records invalid raw output and throws when schema validation fails twice", async () => {
    const invalidResponse = {
      content: JSON.stringify({ invalid: true }),
      provider: "openrouter",
      model: "test-model",
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      latencyMs: 10,
      cost: null,
    };
    mockGenerateTextWithLlm.mockResolvedValue(invalidResponse);

    await expect(generate()).rejects.toThrow(LlmGenerationError);
    expect(mockGenerateTextWithLlm).toHaveBeenCalledTimes(2);
    expect(mockRecordAiGenerationTrace).toHaveBeenCalledTimes(2);
    expect(mockRecordAiGenerationTrace).toHaveBeenLastCalledWith(
      expect.objectContaining({
        validationStatus: "invalid",
        outputPayload: { raw: JSON.stringify({ invalid: true }) },
      }),
    );
  });

  it("retries once when the first generated batch has duplicate subtype titles", async () => {
    const duplicatePayload = successfulPayload();
    duplicatePayload.packages[1] = packagePayload(
      "fantasy",
      "Ay Işığı Kütüphanecisi",
      "Tamamen farklı bir başlangıç fikri",
    );
    mockGenerateTextWithLlm
      .mockResolvedValueOnce(llmResponse(duplicatePayload))
      .mockResolvedValueOnce(llmResponse(successfulPayload()));

    const result = await generate();

    expect(result.candidates).toHaveLength(4);
    expect(mockGenerateTextWithLlm).toHaveBeenCalledTimes(2);
  });

  it("retries when the generated concepts are too similar to the previous batch", async () => {
    const previousBatch: PreviousBatch = [
      {
        subtype: "Ay Işığı Kütüphanecisi",
        originConcept:
          "Geceleri ay ışığında kitap okuyan küçük bir kütüphaneci",
      },
    ];
    mockGenerateTextWithLlm
      .mockResolvedValueOnce(llmResponse(successfulPayload()))
      .mockResolvedValueOnce(llmResponse(freshPayload()));

    const result = await generate("explorer", previousBatch);

    expect(result.candidates).toHaveLength(4);
    expect(result.candidates[0]?.subtype).toBe("Mercan Haritacısı");
    expect(mockGenerateTextWithLlm).toHaveBeenCalledTimes(2);
  });

  it("rejects access when the user is not a household member", async () => {
    mockFindByIdForUser.mockResolvedValueOnce(null);

    await expect(generate()).rejects.toThrow(
      "User is not a member of this household",
    );
    expect(mockEnsureOriginPackagesPrompt).not.toHaveBeenCalled();
  });

  it("requires a parent policy before starting generation", async () => {
    mockFindByHousehold.mockResolvedValueOnce(null);

    await expect(generate()).rejects.toThrow(
      "Parent policy must exist before character bootstrap",
    );
    expect(mockEnsureOriginPackagesPrompt).not.toHaveBeenCalled();
  });
});
