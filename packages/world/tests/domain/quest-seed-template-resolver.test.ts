import { describe, expect, it } from "vitest";
import {
  QuestSeedTemplateResolver,
  assertKnownQuestSeedTemplateKey,
  QUEST_SEED_DEFAULT_TEMPLATE_KEY,
  QUEST_SEED_TEMPLATE_REGISTRY,
} from "../../src/domain/quest-seed-template-resolver";
import { ValidationError } from "../../src/domain/errors";

describe("QuestSeedTemplateResolver", () => {
  it("resolves a mapped fact id to its template key", () => {
    expect(QuestSeedTemplateResolver.resolve("lost-letter")).toBe(
      "lost-letter-quest",
    );
    expect(QuestSeedTemplateResolver.resolve("bridge-repair")).toBe(
      "bridge-repair-quest",
    );
  });

  it("falls back to the default key for unknown fact ids", () => {
    expect(QuestSeedTemplateResolver.resolve("unknown-fact")).toBe(
      QUEST_SEED_DEFAULT_TEMPLATE_KEY,
    );
  });

  it("falls back to the default key for an empty fact id", () => {
    expect(QuestSeedTemplateResolver.resolve("  ")).toBe(
      QUEST_SEED_DEFAULT_TEMPLATE_KEY,
    );
  });

  it("is deterministic across calls", () => {
    const a = QuestSeedTemplateResolver.resolve("bridge-repair");
    const b = QuestSeedTemplateResolver.resolve("bridge-repair");
    expect(a).toBe(b);
  });

  it("registry values are known seed keys", () => {
    for (const key of Object.values(QUEST_SEED_TEMPLATE_REGISTRY)) {
      expect(() => assertKnownQuestSeedTemplateKey(key)).not.toThrow();
    }
  });

  it("rejects an unknown template key", () => {
    expect(() => assertKnownQuestSeedTemplateKey("nope-quest")).toThrow(
      ValidationError,
    );
  });
});
