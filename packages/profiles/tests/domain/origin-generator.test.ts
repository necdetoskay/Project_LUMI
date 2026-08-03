import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCallOpenRouter = vi.hoisted(() => vi.fn());
const mockFindByIdForUser = vi.hoisted(() => vi.fn());
const mockFindById = vi.hoisted(() => vi.fn());
const mockFindByHousehold = vi.hoisted(() => vi.fn());
const mockFindByUserAndHousehold = vi.hoisted(() => vi.fn());
const mockFindByTaskType = vi.hoisted(() => vi.fn());

vi.mock("../../src/application/llm-settings/openrouter-client", () => ({
  callOpenRouter: mockCallOpenRouter,
}));

vi.mock("../../src/application/llm-settings/encryption", () => ({
  decryptApiKey: vi.fn(() => "sk-or-v1-test-decrypted-key"),
  encryptApiKey: vi.fn(() => "mock-encrypted"),
  maskApiKey: vi.fn(() => "sk-or-v1...key"),
}));

vi.mock("../../src/db", () => {
  function MockHouseholdRepo() { return { findByIdForUser: mockFindByIdForUser }; }
  function MockChildRepo() { return { findById: mockFindById }; }
  function MockPolicyRepo() { return { findByHousehold: mockFindByHousehold }; }
  function MockProviderRepo() { return { findByUserAndHousehold: mockFindByUserAndHousehold }; }
  function MockTaskRepo() { return { findByTaskType: mockFindByTaskType }; }
  return {
    getProfileDb: function () { return {}; },
    DrizzleHouseholdRepository: MockHouseholdRepo,
    DrizzleChildProfileRepository: MockChildRepo,
    DrizzleParentPolicyRepository: MockPolicyRepo,
    DrizzleLlmProviderSettingsRepository: MockProviderRepo,
    DrizzleLlmTaskModelSettingsRepository: MockTaskRepo,
  };
});

import { generateOriginPackages, LlmGenerationError, LlmConfigError } from "../../src/application/llm-settings/origin-generator";

const TEST_USER_ID = "user-001";
const TEST_HOUSEHOLD_ID = "household-001";
const TEST_CHILD_PROFILE_ID = "child-001";

function setupValidMocks() {
  mockFindByIdForUser.mockResolvedValue({ id: TEST_HOUSEHOLD_ID, name: "Test Household" });
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

function setupFullLlmMocks(modelId = "test-model", temperature = 0.85, maxTokens = 1800) {
  mockFindByTaskType.mockResolvedValue({
    enabled: true,
    modelId,
    temperature,
    maxOutputTokens: maxTokens,
  });
  mockFindByUserAndHousehold.mockResolvedValue({
    encryptedApiKey: "dGVzdC1lbmNyeXB0ZWQta2V5",
    enabled: true,
  });
}

function setupNoKeyMock() {
  mockFindByTaskType.mockResolvedValue(null);
  mockFindByUserAndHousehold.mockResolvedValue(null);
}

function setupDisabledProviderMock() {
  mockFindByUserAndHousehold.mockResolvedValue({
    encryptedApiKey: "dGVzdC1lbmNyeXB0ZWQta2V5",
    enabled: false,
  });
  mockFindByTaskType.mockResolvedValue(null);
}

function setupDisabledTaskMock() {
  mockFindByUserAndHousehold.mockResolvedValue({
    encryptedApiKey: "dGVzdC1lbmNyeXB0ZWQta2V5",
    enabled: true,
  });
  mockFindByTaskType.mockResolvedValue({
    enabled: false,
    modelId: "test-model",
    temperature: 0.85,
    maxOutputTokens: 1800,
  });
}

function setupNoTaskMock() {
  mockFindByUserAndHousehold.mockResolvedValue({
    encryptedApiKey: "dGVzdC1lbmNyeXB0ZWQta2V5",
    enabled: true,
  });
  mockFindByTaskType.mockResolvedValue(null);
}

function setupOpenRouterSuccess() {
  mockCallOpenRouter.mockResolvedValue({
    content: JSON.stringify({
      packages: [
        {
          broadKind: "human",
          characterType: "explorer",
          subtype: "Ay Işığı Kütüphanecisi",
          originConcept: "Geceleri ay ışığında kitap okuyan küçük bir kütüphaneci",
          startingRegionArchetype: "orman kenarı",
          startingLocation: "Eski kütüphane girişi",
          homeArchetype: "Kitaplarla dolu bir kulübe",
          nearbyNpcSeed: "Bilge kitap kurdu",
          firstMysterySeed: "Kayıp sayfaların sırrı",
          toneVector: ["wonder", "curiosity"],
          noveltyMarkers: ["Ay ışığında parlayan gözlük", "Kendi kendine açılan kitap"],
        },
        {
          broadKind: "fantasy",
          characterType: "explorer",
          subtype: "Bulut Tamircisi",
          originConcept: "Bulutların üstünde uçan tamir araçlarıyla bulutları onaran bir çocuk",
          startingRegionArchetype: "bulut adası",
          startingLocation: "Bulut atölyesi",
          homeArchetype: "Uçan tamir kulübesi",
          nearbyNpcSeed: "Rüzgar ustası",
          firstMysterySeed: "Konuşan bulutların mesajı",
          toneVector: ["warmth", "humor"],
          noveltyMarkers: ["Bulutları şekillendiren anahtar", "Onarılmış her buluttan çıkan melodi"],
        },
        {
          broadKind: "animal",
          characterType: "explorer",
          subtype: "Zaman Bahçecisi",
          originConcept: "Zamanın yavaş aktığı gizli bir bahçede çiçeklerle dans eden bir bahçıvan",
          startingRegionArchetype: "sessiz orman",
          startingLocation: "Gizli bahçe kapısı",
          homeArchetype: "Asma dallarından ev",
          nearbyNpcSeed: "Konuşan kaplumbağa",
          firstMysterySeed: "Hiç solmayan çiçeğin sırrı",
          toneVector: ["mystery", "wonder"],
          noveltyMarkers: ["Zamanı durduran sulama kabı", "Çiçeklerle iletişim kuran şapka"],
        },
        {
          broadKind: "robot",
          characterType: "explorer",
          subtype: "Yıldız Habercisi",
          originConcept: "Yıldızlardan gelen mesajları çözen küçük bir robot",
          startingRegionArchetype: "gözlemevi",
          startingLocation: "Yıldız gözlem kulesi",
          homeArchetype: "Metalik bir yuva",
          nearbyNpcSeed: "Bilge saatçi",
          firstMysterySeed: "Yıldız haritasındaki gizemli işaret",
          toneVector: ["courage", "wonder"],
          noveltyMarkers: ["Yıldız tozu üreten anten", "Mesajları ışığa dönüştüren ekran"],
        },
      ],
    }),
    model: "test-model",
    usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
  });
}

function setupOpenRouterFailure() {
  mockCallOpenRouter.mockRejectedValue(new Error("Insufficient credits"));
}

describe("origin-generator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupValidMocks();
  });

  describe("when LLM is fully configured and API works", () => {
    beforeEach(() => {
      setupFullLlmMocks();
      setupOpenRouterSuccess();
    });

    it("returns LLM-generated packages with source='llm'", async () => {
      const result = await generateOriginPackages(
        TEST_USER_ID,
        TEST_HOUSEHOLD_ID,
        TEST_CHILD_PROFILE_ID,
        "explorer",
        "auto",
      );

      expect(result.source).toBe("llm");
      expect(result.modelId).toBe("test-model");
      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it("returns unique packages from LLM (not deterministic fallback pool)", async () => {
      const result = await generateOriginPackages(
        TEST_USER_ID,
        TEST_HOUSEHOLD_ID,
        TEST_CHILD_PROFILE_ID,
        "explorer",
        "auto",
      );

      const subtypes = result.candidates.map((c) => c.subtype);
      expect(subtypes).toContain("Ay Işığı Kütüphanecisi");
      expect(subtypes).toContain("Bulut Tamircisi");
      expect(subtypes).toContain("Zaman Bahçecisi");
    });

    it("calls OpenRouter with correct parameters", async () => {
      await generateOriginPackages(
        TEST_USER_ID,
        TEST_HOUSEHOLD_ID,
        TEST_CHILD_PROFILE_ID,
        "inventor",
        "auto",
      );

      expect(mockCallOpenRouter).toHaveBeenCalledTimes(1);
      const [, options] = mockCallOpenRouter.mock.calls[0] as [string, { model: string }];
      expect(options.model).toBe("test-model");
    });
  });

  describe("when LLM is configured and call fails", () => {
    beforeEach(() => {
      setupFullLlmMocks();
      setupOpenRouterFailure();
    });

    it("throws LlmGenerationError instead of silently falling back", async () => {
      await expect(
        generateOriginPackages(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
          "explorer",
          "auto",
        ),
      ).rejects.toThrow(LlmGenerationError);
    });

    it("does not return any candidates on failure", async () => {
      try {
        await generateOriginPackages(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
          "explorer",
          "auto",
        );
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(LlmGenerationError);
        expect((e as LlmGenerationError).message).toBe("Insufficient credits");
      }
    });
  });

  describe("when OpenRouter API key is missing", () => {
    beforeEach(setupNoKeyMock);

    it("throws LlmConfigError with LLM_KEY_MISSING code", async () => {
      await expect(
        generateOriginPackages(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
          "explorer",
          "auto",
        ),
      ).rejects.toThrow(LlmConfigError);
    });

    it("throws error with code LLM_KEY_MISSING", async () => {
      try {
        await generateOriginPackages(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
          "explorer",
          "auto",
        );
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(LlmConfigError);
        expect((e as LlmConfigError).code).toBe("LLM_KEY_MISSING");
      }
    });

    it("does not call OpenRouter when not configured", async () => {
      try {
        await generateOriginPackages(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
          "explorer",
          "auto",
        );
      } catch { /* expected */ }
      expect(mockCallOpenRouter).not.toHaveBeenCalled();
    });
  });

  describe("when provider is disabled", () => {
    beforeEach(setupDisabledProviderMock);

    it("throws LlmConfigError with LLM_PROVIDER_DISABLED code", async () => {
      try {
        await generateOriginPackages(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
          "explorer",
          "auto",
        );
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(LlmConfigError);
        expect((e as LlmConfigError).code).toBe("LLM_PROVIDER_DISABLED");
      }
    });
  });

  describe("when task model setting is missing", () => {
    beforeEach(setupNoTaskMock);

    it("throws LlmConfigError with LLM_TASK_MISSING code", async () => {
      try {
        await generateOriginPackages(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
          "explorer",
          "auto",
        );
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(LlmConfigError);
        expect((e as LlmConfigError).code).toBe("LLM_TASK_MISSING");
      }
    });
  });

  describe("when task is disabled", () => {
    beforeEach(setupDisabledTaskMock);

    it("throws LlmConfigError with LLM_TASK_DISABLED code", async () => {
      try {
        await generateOriginPackages(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
          "explorer",
          "auto",
        );
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(LlmConfigError);
        expect((e as LlmConfigError).code).toBe("LLM_TASK_DISABLED");
      }
    });
  });
});
