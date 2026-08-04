import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCallOpenRouter = vi.hoisted(() => vi.fn());
const mockFindByIdForUser = vi.hoisted(() => vi.fn());
const mockFindById = vi.hoisted(() => vi.fn());
const mockFindByHousehold = vi.hoisted(() => vi.fn());
const mockFindByUserAndHousehold = vi.hoisted(() => vi.fn());
const mockFindByTaskType = vi.hoisted(() => vi.fn());
const mockCreateBatch = vi.hoisted(() => vi.fn());

vi.mock("../../src/application/llm-settings/openrouter-client", () => ({
  callOpenRouter: mockCallOpenRouter,
}));

vi.mock("../../src/application/llm-settings/encryption", () => ({
  decryptApiKey: vi.fn(() => "sk-or-v1-test-decrypted-key"),
  encryptApiKey: vi.fn(() => "mock-encrypted"),
  maskApiKey: vi.fn(() => "sk-or-v1...key"),
}));

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
  function MockProviderRepo() {
    return { findByUserAndHousehold: mockFindByUserAndHousehold };
  }
  function MockTaskRepo() {
    return { findByTaskType: mockFindByTaskType };
  }
  function MockBatchRepo() {
    return { create: mockCreateBatch };
  }
  return {
    getProfileDb: function () {
      return {};
    },
    DrizzleHouseholdRepository: MockHouseholdRepo,
    DrizzleChildProfileRepository: MockChildRepo,
    DrizzleParentPolicyRepository: MockPolicyRepo,
    DrizzleLlmProviderSettingsRepository: MockProviderRepo,
    DrizzleLlmTaskModelSettingsRepository: MockTaskRepo,
    DrizzleArchetypeSuggestionBatchRepository: MockBatchRepo,
  };
});

import {
  generateArchetypes,
  LlmGenerationError,
  LlmConfigError,
} from "../../src/application/llm-settings/archetype-generator";

const TEST_USER_ID = "user-001";
const TEST_HOUSEHOLD_ID = "household-001";
const TEST_CHILD_PROFILE_ID = "child-001";

function setupValidMocks() {
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

function setupFullLlmMocks() {
  mockFindByTaskType.mockResolvedValue({
    enabled: true,
    modelId: "aion-labs/aion-3.0-mini",
    temperature: 0.85,
    maxOutputTokens: 1800,
  });
  mockFindByUserAndHousehold.mockResolvedValue({
    encryptedApiKey: "dGVzdC1lbmNyeXB0ZWQta2V5",
    enabled: true,
  });
}

function validArchetypesJson(suffix = ""): string {
  return JSON.stringify({
    archetypes: [
      {
        canonicalType: "explorer",
        title: `E Title ${suffix}`,
        description: "Explorer desc text long enough",
        personalityHook: "E hook",
        storyPromise: "E promise",
        themeTags: ["keşif", "merak"],
      },
      {
        canonicalType: "inventor",
        title: `I Title ${suffix}`,
        description: "Inventor desc text long enough",
        personalityHook: "I hook",
        storyPromise: "I promise",
        themeTags: ["icat", "yaratıcılık"],
      },
      {
        canonicalType: "storyteller",
        title: `S Title ${suffix}`,
        description: "Storyteller desc text long enough",
        personalityHook: "S hook",
        storyPromise: "S promise",
        themeTags: ["masal", "hayal"],
      },
      {
        canonicalType: "helper",
        title: `H Title ${suffix}`,
        description: "Helper desc text long enough",
        personalityHook: "H hook",
        storyPromise: "H promise",
        themeTags: ["yardım", "empati"],
      },
      {
        canonicalType: "dreamer",
        title: `D Title ${suffix}`,
        description: "Dreamer desc text long enough",
        personalityHook: "D hook",
        storyPromise: "D promise",
        themeTags: ["rüya", "hayal"],
      },
    ],
  });
}

function mockOpenRouterResponse(content: string) {
  return {
    content,
    model: "aion-labs/aion-3.0-mini",
    usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
  };
}

describe("archetype-generator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupValidMocks();
    setupFullLlmMocks();
    mockCreateBatch.mockResolvedValue({
      id: "test-batch-id",
      archetypes: [],
      modelId: "aion-labs/aion-3.0-mini",
    });
  });

  describe("exact 5 count validation", () => {
    it("throws when LLM returns 4 archetypes (after 2 retry attempts)", async () => {
      mockCallOpenRouter.mockResolvedValue(
        mockOpenRouterResponse(
          JSON.stringify({
            archetypes: [
              {
                canonicalType: "explorer",
                title: "E",
                description: "Explorer desc text long enough",
                personalityHook: "E hook",
                storyPromise: "E promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "inventor",
                title: "I",
                description: "Inventor desc text long enough",
                personalityHook: "I hook",
                storyPromise: "I promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "storyteller",
                title: "S",
                description: "Storyteller desc text long enough",
                personalityHook: "S hook",
                storyPromise: "S promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "helper",
                title: "H",
                description: "Helper desc text long enough",
                personalityHook: "H hook",
                storyPromise: "H promise",
                themeTags: ["t1", "t2"],
              },
            ],
          }),
        ),
      );
      await expect(
        generateArchetypes(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
        ),
      ).rejects.toThrow(LlmGenerationError);
      expect(mockCallOpenRouter).toHaveBeenCalledTimes(2);
    });

    it("throws when LLM returns 6 archetypes (no early slice)", async () => {
      mockCallOpenRouter.mockResolvedValue(
        mockOpenRouterResponse(
          JSON.stringify({
            archetypes: [
              {
                canonicalType: "explorer",
                title: "E",
                description: "Explorer desc text long enough",
                personalityHook: "E hook",
                storyPromise: "E promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "inventor",
                title: "I",
                description: "Inventor desc text long enough",
                personalityHook: "I hook",
                storyPromise: "I promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "storyteller",
                title: "S",
                description: "Storyteller desc text long enough",
                personalityHook: "S hook",
                storyPromise: "S promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "helper",
                title: "H",
                description: "Helper desc text long enough",
                personalityHook: "H hook",
                storyPromise: "H promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "dreamer",
                title: "D",
                description: "Dreamer desc text long enough",
                personalityHook: "D hook",
                storyPromise: "D promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "explorer",
                title: "E2",
                description: "Second explorer",
                personalityHook: "E2 hook",
                storyPromise: "E2 promise",
                themeTags: ["t1", "t2"],
              },
            ],
          }),
        ),
      );
      await expect(
        generateArchetypes(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
        ),
      ).rejects.toThrow(LlmGenerationError);
    });
  });

  describe("structured parser validation", () => {
    it("rejects invalid canonicalType enum", async () => {
      mockCallOpenRouter.mockResolvedValue(
        mockOpenRouterResponse(
          JSON.stringify({
            archetypes: [
              {
                canonicalType: "wizard",
                title: "W Title",
                description: "Wizard desc text long enough",
                personalityHook: "W hook",
                storyPromise: "W promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "inventor",
                title: "I",
                description: "Inventor desc text long enough",
                personalityHook: "I hook",
                storyPromise: "I promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "storyteller",
                title: "S",
                description: "Storyteller desc text long enough",
                personalityHook: "S hook",
                storyPromise: "S promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "helper",
                title: "H",
                description: "Helper desc text long enough",
                personalityHook: "H hook",
                storyPromise: "H promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "dreamer",
                title: "D",
                description: "Dreamer desc text long enough",
                personalityHook: "D hook",
                storyPromise: "D promise",
                themeTags: ["t1", "t2"],
              },
            ],
          }),
        ),
      );
      await expect(
        generateArchetypes(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
        ),
      ).rejects.toThrow(LlmGenerationError);
    });

    it("rejects too-short title", async () => {
      mockCallOpenRouter.mockResolvedValue(
        mockOpenRouterResponse(
          JSON.stringify({
            archetypes: [
              {
                canonicalType: "explorer",
                title: "E",
                description: "Explorer desc text long enough",
                personalityHook: "E hook",
                storyPromise: "E promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "inventor",
                title: "I",
                description: "Inventor desc text long enough",
                personalityHook: "I hook",
                storyPromise: "I promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "storyteller",
                title: "S",
                description: "Storyteller desc text long enough",
                personalityHook: "S hook",
                storyPromise: "S promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "helper",
                title: "H",
                description: "Helper desc text long enough",
                personalityHook: "H hook",
                storyPromise: "H promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "dreamer",
                title: "D",
                description: "Dreamer desc text long enough",
                personalityHook: "D hook",
                storyPromise: "D promise",
                themeTags: ["t1", "t2"],
              },
            ],
          }),
        ),
      );
      await expect(
        generateArchetypes(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
        ),
      ).rejects.toThrow(LlmGenerationError);
    });

    it("rejects too-short description", async () => {
      mockCallOpenRouter.mockResolvedValue(
        mockOpenRouterResponse(
          JSON.stringify({
            archetypes: [
              {
                canonicalType: "explorer",
                title: "E Title",
                description: "short",
                personalityHook: "E hook",
                storyPromise: "E promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "inventor",
                title: "I Title",
                description: "Inventor desc text long enough",
                personalityHook: "I hook",
                storyPromise: "I promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "storyteller",
                title: "S Title",
                description: "Storyteller desc text long enough",
                personalityHook: "S hook",
                storyPromise: "S promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "helper",
                title: "H Title",
                description: "Helper desc text long enough",
                personalityHook: "H hook",
                storyPromise: "H promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "dreamer",
                title: "D Title",
                description: "Dreamer desc text long enough",
                personalityHook: "D hook",
                storyPromise: "D promise",
                themeTags: ["t1", "t2"],
              },
            ],
          }),
        ),
      );
      await expect(
        generateArchetypes(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
        ),
      ).rejects.toThrow(LlmGenerationError);
    });

    it("rejects missing themeTags", async () => {
      mockCallOpenRouter.mockResolvedValue(
        mockOpenRouterResponse(
          JSON.stringify({
            archetypes: [
              {
                canonicalType: "explorer",
                title: "E Title",
                description: "Explorer desc text long enough",
                personalityHook: "E hook",
                storyPromise: "E promise",
              },
              {
                canonicalType: "inventor",
                title: "I Title",
                description: "Inventor desc text long enough",
                personalityHook: "I hook",
                storyPromise: "I promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "storyteller",
                title: "S Title",
                description: "Storyteller desc text long enough",
                personalityHook: "S hook",
                storyPromise: "S promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "helper",
                title: "H Title",
                description: "Helper desc text long enough",
                personalityHook: "H hook",
                storyPromise: "H promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "dreamer",
                title: "D Title",
                description: "Dreamer desc text long enough",
                personalityHook: "D hook",
                storyPromise: "D promise",
                themeTags: ["t1", "t2"],
              },
            ],
          }),
        ),
      );
      await expect(
        generateArchetypes(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
        ),
      ).rejects.toThrow(LlmGenerationError);
    });

    it("rejects only 1 themeTag (minimum is 2)", async () => {
      mockCallOpenRouter.mockResolvedValue(
        mockOpenRouterResponse(
          JSON.stringify({
            archetypes: [
              {
                canonicalType: "explorer",
                title: "E Title",
                description: "Explorer desc text long enough",
                personalityHook: "E hook",
                storyPromise: "E promise",
                themeTags: ["t1"],
              },
              {
                canonicalType: "inventor",
                title: "I Title",
                description: "Inventor desc text long enough",
                personalityHook: "I hook",
                storyPromise: "I promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "storyteller",
                title: "S Title",
                description: "Storyteller desc text long enough",
                personalityHook: "S hook",
                storyPromise: "S promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "helper",
                title: "H Title",
                description: "Helper desc text long enough",
                personalityHook: "H hook",
                storyPromise: "H promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "dreamer",
                title: "D Title",
                description: "Dreamer desc text long enough",
                personalityHook: "D hook",
                storyPromise: "D promise",
                themeTags: ["t1", "t2"],
              },
            ],
          }),
        ),
      );
      await expect(
        generateArchetypes(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
        ),
      ).rejects.toThrow(LlmGenerationError);
    });
  });

  describe("duplicate rejection", () => {
    it("rejects duplicate canonicalType", async () => {
      mockCallOpenRouter.mockResolvedValue(
        mockOpenRouterResponse(
          JSON.stringify({
            archetypes: [
              {
                canonicalType: "explorer",
                title: "E1 Title",
                description: "E1 desc text long enough",
                personalityHook: "E1 hook",
                storyPromise: "E1 promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "explorer",
                title: "E2 Title",
                description: "E2 desc text long enough",
                personalityHook: "E2 hook",
                storyPromise: "E2 promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "storyteller",
                title: "S Title",
                description: "S desc text long enough",
                personalityHook: "S hook",
                storyPromise: "S promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "helper",
                title: "H Title",
                description: "H desc text long enough",
                personalityHook: "H hook",
                storyPromise: "H promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "dreamer",
                title: "D Title",
                description: "D desc text long enough",
                personalityHook: "D hook",
                storyPromise: "D promise",
                themeTags: ["t1", "t2"],
              },
            ],
          }),
        ),
      );
      await expect(
        generateArchetypes(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
        ),
      ).rejects.toThrow(LlmGenerationError);
    });

    it("rejects duplicate title", async () => {
      mockCallOpenRouter.mockResolvedValue(
        mockOpenRouterResponse(
          JSON.stringify({
            archetypes: [
              {
                canonicalType: "explorer",
                title: "Same Title",
                description: "E desc text long enough",
                personalityHook: "E hook",
                storyPromise: "E promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "inventor",
                title: "Same Title",
                description: "I desc text long enough",
                personalityHook: "I hook",
                storyPromise: "I promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "storyteller",
                title: "S Title",
                description: "S desc text long enough",
                personalityHook: "S hook",
                storyPromise: "S promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "helper",
                title: "H Title",
                description: "H desc text long enough",
                personalityHook: "H hook",
                storyPromise: "H promise",
                themeTags: ["t1", "t2"],
              },
              {
                canonicalType: "dreamer",
                title: "D Title",
                description: "D desc text long enough",
                personalityHook: "D hook",
                storyPromise: "D promise",
                themeTags: ["t1", "t2"],
              },
            ],
          }),
        ),
      );
      await expect(
        generateArchetypes(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
        ),
      ).rejects.toThrow(LlmGenerationError);
    });
  });

  describe("retry: 2 real OpenRouter calls", () => {
    it("retries with new nonce when first attempt validation fails", async () => {
      // First call: invalid (too-short title)
      mockCallOpenRouter.mockResolvedValueOnce(
        mockOpenRouterResponse(
          JSON.stringify({
            archetypes: [
              {
                canonicalType: "explorer",
                title: "E",
                description: "E desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
              {
                canonicalType: "inventor",
                title: "I",
                description: "I desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
              {
                canonicalType: "storyteller",
                title: "S",
                description: "S desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
              {
                canonicalType: "helper",
                title: "H",
                description: "H desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
              {
                canonicalType: "dreamer",
                title: "D",
                description: "D desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
            ],
          }),
        ),
      );
      // Second call: valid
      mockCallOpenRouter.mockResolvedValueOnce(
        mockOpenRouterResponse(validArchetypesJson("retry1")),
      );

      const result = await generateArchetypes(
        TEST_USER_ID,
        TEST_HOUSEHOLD_ID,
        TEST_CHILD_PROFILE_ID,
      );
      expect(mockCallOpenRouter).toHaveBeenCalledTimes(2);
      expect(result.archetypes).toHaveLength(5);
    });

    it("retries when first attempt has similar concepts to excludedConcepts", async () => {
      // First attempt returns concepts similar to excluded (same words)
      const excluded = [
        {
          title: "Yıldız haritacısı çocuk karakteri",
          description:
            "yıldız haritalarını takip eden küçük bir kaşif çocuk karakteri",
          personalityHook: "meraklı ve sabırlı biri",
          storyPromise: "gökyüzündeki yıldızları birleştirir",
        },
        {
          title: "Çılgın mucit çocuk",
          description: "atölyesinde icatlar yapan bir mucit çocuk karakteri",
          personalityHook: "yaratıcı ve hata yapmaktan korkmayan",
          storyPromise: "atık malzemeleri işe yarar araçlara dönüştürür",
        },
        {
          title: "Masalcı dede",
          description: "hikayeleriyle büyüleyen genç bir anlatıcı çocuk",
          personalityHook: "hayalperest ve dinlemeyi seven",
          storyPromise: "masalları gerçeğe dönüştürür",
        },
        {
          title: "Yardımsever çocuk",
          description: "çevresine destek olan bir yardımcı çocuk karakteri",
          personalityHook: "empatik ve çözüm odaklı",
          storyPromise: "küçük yardımlarla büyük sorunları çözer",
        },
        {
          title: "Rüya gezgini",
          description: "rüya dünyasında yolculuk eden bir hayalperest çocuk",
          personalityHook: "hayalperest ve yaratıcı biri",
          storyPromise: "rüyaları paylaşılabilir hikayelere dönüştürür",
        },
      ];
      // First attempt: returns same concepts (similar)
      mockCallOpenRouter.mockResolvedValueOnce(
        mockOpenRouterResponse(
          JSON.stringify({
            archetypes: [
              {
                canonicalType: "explorer",
                title: "Yıldız haritacısı çocuk karakteri",
                description:
                  "yıldız haritalarını takip eden küçük bir kaşif çocuk karakteri",
                personalityHook: "meraklı ve sabırlı biri",
                storyPromise: "gökyüzündeki yıldızları birleştirir",
                themeTags: ["keşif", "merak"],
              },
              {
                canonicalType: "inventor",
                title: "Çılgın mucit çocuk",
                description:
                  "atölyesinde icatlar yapan bir mucit çocuk karakteri",
                personalityHook: "yaratıcı ve hata yapmaktan korkmayan",
                storyPromise: "atık malzemeleri işe yarar araçlara dönüştürür",
                themeTags: ["icat", "yaratıcılık"],
              },
              {
                canonicalType: "storyteller",
                title: "Masalcı dede",
                description: "hikayeleriyle büyüleyen genç bir anlatıcı çocuk",
                personalityHook: "hayalperest ve dinlemeyi seven",
                storyPromise: "masalları gerçeğe dönüştürür",
                themeTags: ["masal", "hayal"],
              },
              {
                canonicalType: "helper",
                title: "Yardımsever çocuk",
                description:
                  "çevresine destek olan bir yardımcı çocuk karakteri",
                personalityHook: "empatik ve çözüm odaklı",
                storyPromise: "küçük yardımlarla büyük sorunları çözer",
                themeTags: ["yardım", "empati"],
              },
              {
                canonicalType: "dreamer",
                title: "Rüya gezgini",
                description:
                  "rüya dünyasında yolculuk eden bir hayalperest çocuk",
                personalityHook: "hayalperest ve yaratıcı biri",
                storyPromise: "rüyaları paylaşılabilir hikayelere dönüştürür",
                themeTags: ["rüya", "hayal"],
              },
            ],
          }),
        ),
      );
      // Second call: truly different concepts
      mockCallOpenRouter.mockResolvedValueOnce(
        mockOpenRouterResponse(
          JSON.stringify({
            archetypes: [
              {
                canonicalType: "explorer",
                title: "Tamamen farklı başlık alfa",
                description: "Tamamen farklı bir keşif hikayesi burada uzun",
                personalityHook: "Alfa hook",
                storyPromise: "Alfa promise",
                themeTags: ["keşif", "merak"],
              },
              {
                canonicalType: "inventor",
                title: "Tamamen farklı başlık beta",
                description: "Tamamen farklı bir mucit hikayesi burada uzun",
                personalityHook: "Beta hook",
                storyPromise: "Beta promise",
                themeTags: ["icat", "yaratıcılık"],
              },
              {
                canonicalType: "storyteller",
                title: "Tamamen farklı başlık gama",
                description: "Tamamen farklı bir hikayeci hikayesi burada uzun",
                personalityHook: "Gama hook",
                storyPromise: "Gama promise",
                themeTags: ["masal", "hayal"],
              },
              {
                canonicalType: "helper",
                title: "Tamamen farklı başlık delta",
                description: "Tamamen farklı bir yardimci hikayesi burada uzun",
                personalityHook: "Delta hook",
                storyPromise: "Delta promise",
                themeTags: ["yardım", "empati"],
              },
              {
                canonicalType: "dreamer",
                title: "Tamamen farklı başlık epsilon",
                description: "Tamamen farklı bir rüya hikayesi burada uzun",
                personalityHook: "Epsilon hook",
                storyPromise: "Epsilon promise",
                themeTags: ["rüya", "hayal"],
              },
            ],
          }),
        ),
      );

      const result = await generateArchetypes(
        TEST_USER_ID,
        TEST_HOUSEHOLD_ID,
        TEST_CHILD_PROFILE_ID,
        excluded,
      );
      expect(mockCallOpenRouter).toHaveBeenCalledTimes(2);
      expect(result.archetypes).toHaveLength(5);
    });

    it("throws LlmGenerationError if both attempts fail", async () => {
      // Both attempts: too-short title
      mockCallOpenRouter.mockResolvedValueOnce(
        mockOpenRouterResponse(
          JSON.stringify({
            archetypes: [
              {
                canonicalType: "explorer",
                title: "E",
                description: "E desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
              {
                canonicalType: "inventor",
                title: "I",
                description: "I desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
              {
                canonicalType: "storyteller",
                title: "S",
                description: "S desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
              {
                canonicalType: "helper",
                title: "H",
                description: "H desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
              {
                canonicalType: "dreamer",
                title: "D",
                description: "D desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
            ],
          }),
        ),
      );
      mockCallOpenRouter.mockResolvedValueOnce(
        mockOpenRouterResponse(
          JSON.stringify({
            archetypes: [
              {
                canonicalType: "explorer",
                title: "X",
                description: "X desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
              {
                canonicalType: "inventor",
                title: "Y",
                description: "Y desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
              {
                canonicalType: "storyteller",
                title: "Z",
                description: "Z desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
              {
                canonicalType: "helper",
                title: "W",
                description: "W desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
              {
                canonicalType: "dreamer",
                title: "V",
                description: "V desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
            ],
          }),
        ),
      );

      await expect(
        generateArchetypes(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
        ),
      ).rejects.toThrow(LlmGenerationError);
      expect(mockCallOpenRouter).toHaveBeenCalledTimes(2);
    });

    it("does not retry when first attempt succeeds", async () => {
      mockCallOpenRouter.mockResolvedValueOnce(
        mockOpenRouterResponse(validArchetypesJson("once")),
      );

      const result = await generateArchetypes(
        TEST_USER_ID,
        TEST_HOUSEHOLD_ID,
        TEST_CHILD_PROFILE_ID,
      );
      expect(mockCallOpenRouter).toHaveBeenCalledTimes(1);
      expect(result.archetypes).toHaveLength(5);
    });

    it("throws LlmGenerationError on API error after 2 attempts (network/fail)", async () => {
      mockCallOpenRouter.mockRejectedValue(new Error("Connection failed"));

      await expect(
        generateArchetypes(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
        ),
      ).rejects.toThrow(LlmGenerationError);
      expect(mockCallOpenRouter).toHaveBeenCalledTimes(2);
    });
  });

  describe("config error path (no fallback)", () => {
    it("throws LlmConfigError LLM_KEY_MISSING when no API key", async () => {
      mockFindByUserAndHousehold.mockResolvedValue(null);
      mockFindByTaskType.mockResolvedValue(null);
      try {
        await generateArchetypes(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
        );
        expect.unreachable("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(LlmConfigError);
        expect((e as LlmConfigError).code).toBe("LLM_KEY_MISSING");
      }
    });

    it("throws LlmConfigError LLM_TASK_MISSING when no task", async () => {
      mockFindByUserAndHousehold.mockResolvedValue({
        encryptedApiKey: "dGVzdC1lbmNyeXB0ZWQta2V5",
        enabled: true,
      });
      mockFindByTaskType.mockResolvedValue(null);
      try {
        await generateArchetypes(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
        );
        expect.unreachable("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(LlmConfigError);
        expect((e as LlmConfigError).code).toBe("LLM_TASK_MISSING");
      }
    });

    it("throws LlmConfigError LLM_PROVIDER_DISABLED when provider is disabled", async () => {
      mockFindByUserAndHousehold.mockResolvedValue({
        encryptedApiKey: "dGVzdC1lbmNyeXB0ZWQta2V5",
        enabled: false,
      });
      mockFindByTaskType.mockResolvedValue(null);
      try {
        await generateArchetypes(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
        );
        expect.unreachable("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(LlmConfigError);
        expect((e as LlmConfigError).code).toBe("LLM_PROVIDER_DISABLED");
      }
    });

    it("throws LlmConfigError LLM_TASK_DISABLED when task is disabled", async () => {
      mockFindByUserAndHousehold.mockResolvedValue({
        encryptedApiKey: "dGVzdC1lbmNyeXB0ZWQta2V5",
        enabled: true,
      });
      mockFindByTaskType.mockResolvedValue({
        enabled: false,
        modelId: "aion-labs/aion-3.0-mini",
        temperature: 0.85,
        maxOutputTokens: 1800,
      });
      try {
        await generateArchetypes(
          TEST_USER_ID,
          TEST_HOUSEHOLD_ID,
          TEST_CHILD_PROFILE_ID,
        );
        expect.unreachable("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(LlmConfigError);
        expect((e as LlmConfigError).code).toBe("LLM_TASK_DISABLED");
      }
    });
  });

  describe("batch persistence", () => {
    it("persists the batch with 5 archetypes to DB", async () => {
      mockCallOpenRouter.mockResolvedValueOnce(
        mockOpenRouterResponse(validArchetypesJson("batch-test")),
      );
      const result = await generateArchetypes(
        TEST_USER_ID,
        TEST_HOUSEHOLD_ID,
        TEST_CHILD_PROFILE_ID,
      );
      expect(result.batchId).toBeTruthy();
      expect(mockCreateBatch).toHaveBeenCalledTimes(1);
      const createCall = mockCreateBatch.mock.calls[0]!;
      const createArg = createCall[0] as { archetypes: unknown[] };
      expect(createArg.archetypes).toHaveLength(5);
    });

    it("uses the 2nd attempt nonce when retry succeeds (nonce tracking fix)", async () => {
      mockCallOpenRouter.mockResolvedValueOnce(
        mockOpenRouterResponse(
          JSON.stringify({
            archetypes: [
              {
                canonicalType: "explorer",
                title: "E",
                description: "E desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
              {
                canonicalType: "inventor",
                title: "I",
                description: "I desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
              {
                canonicalType: "storyteller",
                title: "S",
                description: "S desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
              {
                canonicalType: "helper",
                title: "H",
                description: "H desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
              {
                canonicalType: "dreamer",
                title: "D",
                description: "D desc",
                personalityHook: "h",
                storyPromise: "p",
                themeTags: ["t"],
              },
            ],
          }),
        ),
      );
      mockCallOpenRouter.mockResolvedValueOnce(
        mockOpenRouterResponse(validArchetypesJson("retry-nonce")),
      );

      const result = await generateArchetypes(
        TEST_USER_ID,
        TEST_HOUSEHOLD_ID,
        TEST_CHILD_PROFILE_ID,
      );
      expect(mockCallOpenRouter).toHaveBeenCalledTimes(2);
      expect(mockCreateBatch).toHaveBeenCalledTimes(1);
      const createCall = mockCreateBatch.mock.calls[0]!;
      const createArg = createCall[0] as { generationNonce: string };
      expect(createArg.generationNonce).toBeTruthy();
      expect(typeof createArg.generationNonce).toBe("string");
      expect(result.generationNonce).toBe(createArg.generationNonce);
    });
  });
});
