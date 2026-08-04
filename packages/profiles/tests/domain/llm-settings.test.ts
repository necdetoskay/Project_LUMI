import { describe, it, expect, beforeAll } from "vitest";
import {
  encryptApiKey,
  decryptApiKey,
  maskApiKey,
} from "../../src/application/llm-settings/encryption";
import { parseAndValidateLlmOutput } from "../../src/application/llm-settings/llm-output-parser";

describe("encryption helper", () => {
  beforeAll(() => {
    process.env["LUMI_SETTINGS_ENCRYPTION_KEY"] =
      "test-encryption-key-32chars!!";
  });

  it("encrypts and decrypts a key (roundtrip)", () => {
    const original = "sk-or-v1-test-api-key-12345";
    const encrypted = encryptApiKey(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted.length).toBeGreaterThan(0);

    const decrypted = decryptApiKey(encrypted);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertext for same plaintext (IV random)", () => {
    const key = "sk-or-v1-abcdef";
    const a = encryptApiKey(key);
    const b = encryptApiKey(key);
    expect(a).not.toBe(b);
  });

  it("masks API key correctly", () => {
    const masked = maskApiKey("sk-or-v1-abcdefghijklmnop");
    expect(masked).toContain("sk-or-v1");
    expect(masked).toContain("...");
    expect(masked).not.toContain("abcdefghijklmnop");
  });

  it("handles short keys for masking", () => {
    const masked = maskApiKey("ab");
    expect(masked).toBe("ab****");
  });

  it("throws when no encryption key is set", () => {
    delete process.env["LUMI_SETTINGS_ENCRYPTION_KEY"];
    expect(() => encryptApiKey("test")).toThrow("LUMI_SETTINGS_ENCRYPTION_KEY");
  });
});

describe("LLM output parser", () => {
  it("parses valid LLM output with 4 packages", () => {
    const raw = JSON.stringify({
      packages: [
        {
          broadKind: "human",
          characterType: "explorer",
          subtype: "Yıldız haritacısı",
          originConcept: "Kısa güvenli konsept açıklaması",
          startingRegionArchetype: "orman kenarı",
          startingLocation: "güvenli başlangıç yeri",
          homeArchetype: "ağaç ev",
          nearbyNpcSeed: "nazik rehber",
          firstMysterySeed: "kaybolan pusula",
          toneVector: ["wonder", "curiosity"],
          noveltyMarkers: ["parlayan harita", "şarkı söyleyen pusula"],
        },
      ],
    });
    const result = parseAndValidateLlmOutput(raw);
    expect(result.errors).toHaveLength(0);
    expect(result.packages).toHaveLength(1);
    expect(result.packages[0]!.subtype).toBe("Yıldız haritacısı");
  });

  it("rejects invalid broadKind", () => {
    const raw = JSON.stringify({
      packages: [
        {
          broadKind: "alien_invader",
          characterType: "explorer",
          subtype: "Test",
          originConcept: "A short concept",
          startingRegionArchetype: "forest",
          startingLocation: "safe place",
          homeArchetype: "treehouse",
          nearbyNpcSeed: "guide",
          firstMysterySeed: "mystery",
          toneVector: ["wonder"],
          noveltyMarkers: ["marker1"],
        },
      ],
    });
    const result = parseAndValidateLlmOutput(raw);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.packages).toHaveLength(0);
  });

  it("rejects invalid characterType", () => {
    const raw = JSON.stringify({
      packages: [
        {
          broadKind: "human",
          characterType: "wizard",
          subtype: "Test",
          originConcept: "A short concept",
          startingRegionArchetype: "forest",
          startingLocation: "safe place",
          homeArchetype: "treehouse",
          nearbyNpcSeed: "guide",
          firstMysterySeed: "mystery",
          toneVector: ["wonder"],
          noveltyMarkers: ["marker1"],
        },
      ],
    });
    const result = parseAndValidateLlmOutput(raw);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.packages).toHaveLength(0);
  });

  it("rejects invalid tone vector values", () => {
    const raw = JSON.stringify({
      packages: [
        {
          broadKind: "human",
          characterType: "explorer",
          subtype: "Test",
          originConcept: "A short concept",
          startingRegionArchetype: "forest",
          startingLocation: "safe place",
          homeArchetype: "treehouse",
          nearbyNpcSeed: "guide",
          firstMysterySeed: "mystery",
          toneVector: ["angry", "sad"],
          noveltyMarkers: ["marker1"],
        },
      ],
    });
    const result = parseAndValidateLlmOutput(raw);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.packages).toHaveLength(0);
  });

  it("rejects duplicate origin concepts", () => {
    const raw = JSON.stringify({
      packages: [
        {
          broadKind: "human",
          characterType: "explorer",
          subtype: "Test 1",
          originConcept: "Aynı konsept",
          startingRegionArchetype: "forest",
          startingLocation: "safe place",
          homeArchetype: "treehouse",
          nearbyNpcSeed: "guide",
          firstMysterySeed: "mystery1",
          toneVector: ["wonder"],
          noveltyMarkers: ["marker1"],
        },
        {
          broadKind: "animal",
          characterType: "explorer",
          subtype: "Test 2",
          originConcept: "Aynı konsept",
          startingRegionArchetype: "forest",
          startingLocation: "safe place",
          homeArchetype: "treehouse",
          nearbyNpcSeed: "guide",
          firstMysterySeed: "mystery2",
          toneVector: ["warmth"],
          noveltyMarkers: ["marker2"],
        },
      ],
    });
    const result = parseAndValidateLlmOutput(raw);
    expect(result.packages).toHaveLength(1);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects non-JSON output gracefully", () => {
    const result = parseAndValidateLlmOutput("This is not JSON at all");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.packages).toHaveLength(0);
  });

  it("rejects empty packages array", () => {
    const raw = JSON.stringify({ packages: [] });
    const result = parseAndValidateLlmOutput(raw);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.packages).toHaveLength(0);
  });

  it("extracts JSON from markdown code block", () => {
    const raw =
      '```json\n{"packages":[{"broadKind":"human","characterType":"helper","subtype":"Test","originConcept":"A short concept","startingRegionArchetype":"forest","startingLocation":"safe","homeArchetype":"home","nearbyNpcSeed":"npc","firstMysterySeed":"mystery","toneVector":["wonder"],"noveltyMarkers":["m1"]}]}\n```';
    const result = parseAndValidateLlmOutput(raw);
    expect(result.errors).toHaveLength(0);
    expect(result.packages).toHaveLength(1);
  });

  it("extracts JSON with brace matching from raw text", () => {
    const raw =
      'Here is the result: {"packages":[{"broadKind":"human","characterType":"helper","subtype":"Test","originConcept":"A short concept","startingRegionArchetype":"forest","startingLocation":"safe","homeArchetype":"home","nearbyNpcSeed":"npc","firstMysterySeed":"mystery","toneVector":["wonder"],"noveltyMarkers":["m1"]}]} That\'s it.';
    const result = parseAndValidateLlmOutput(raw);
    expect(result.errors).toHaveLength(0);
    expect(result.packages).toHaveLength(1);
  });

  it("requires packages to be an array", () => {
    const raw = JSON.stringify({ packages: "not-an-array" });
    const result = parseAndValidateLlmOutput(raw);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.packages).toHaveLength(0);
  });

  it("validates subtype length constraints", () => {
    const raw = JSON.stringify({
      packages: [
        {
          broadKind: "human",
          characterType: "explorer",
          subtype: "",
          originConcept: "A short concept",
          startingRegionArchetype: "forest",
          startingLocation: "safe",
          homeArchetype: "home",
          nearbyNpcSeed: "npc",
          firstMysterySeed: "mystery",
          toneVector: ["wonder"],
          noveltyMarkers: ["m1"],
        },
      ],
    });
    const result = parseAndValidateLlmOutput(raw);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.packages).toHaveLength(0);
  });

  it("validates originConcept length constraints", () => {
    const raw = JSON.stringify({
      packages: [
        {
          broadKind: "human",
          characterType: "explorer",
          subtype: "Valid Subtype",
          originConcept: "",
          startingRegionArchetype: "forest",
          startingLocation: "safe",
          homeArchetype: "home",
          nearbyNpcSeed: "npc",
          firstMysterySeed: "mystery",
          toneVector: ["wonder"],
          noveltyMarkers: ["m1"],
        },
      ],
    });
    const result = parseAndValidateLlmOutput(raw);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.packages).toHaveLength(0);
  });

  it("rejects missing noveltyMarkers", () => {
    const raw = JSON.stringify({
      packages: [
        {
          broadKind: "human",
          characterType: "explorer",
          subtype: "Valid Subtype",
          originConcept: "A short concept",
          startingRegionArchetype: "forest",
          startingLocation: "safe",
          homeArchetype: "home",
          nearbyNpcSeed: "npc",
          firstMysterySeed: "mystery",
          toneVector: ["wonder"],
          noveltyMarkers: [],
        },
      ],
    });
    const result = parseAndValidateLlmOutput(raw);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.packages).toHaveLength(0);
  });
});
