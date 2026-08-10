import { describe, expect, it } from "vitest";
import { MemoryDecisionEvidenceBuilder } from "../../src/application/memory-decision-evidence-builder.service";
import type { CandidateAction, CanonicalMemory } from "../../src/domain";

const NOW = new Date("2026-08-10T00:00:00.000Z");

const candidates: CandidateAction[] = [
  {
    id: "join-friends-1",
    kind: "socialize",
    description: "Join nearby friends",
    requiredFactIds: [],
    targetCharacterId: "character-1",
    needTypes: ["belonging"],
    personalityFit: 0.8,
    safety: "safe",
  },
  {
    id: "rest-1",
    kind: "rest",
    description: "Rest here",
    requiredFactIds: [],
    targetCharacterId: null,
    needTypes: ["rest"],
    personalityFit: 0.7,
    safety: "safe",
  },
];

function memory(
  provenance: string[],
  overrides: Partial<CanonicalMemory> = {},
): CanonicalMemory {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    householdId: "22222222-2222-4222-8222-222222222222",
    worldId: "33333333-3333-4333-8333-333333333333",
    childProfileId: "44444444-4444-4444-8444-444444444444",
    ownerType: "npc",
    ownerId: "55555555-5555-4555-8555-555555555555",
    kind: "experience",
    summary: "Free-form words must never control autonomous behavior.",
    salience: 0.8,
    confidence: 0.75,
    sourceType: "story_outcome",
    sourceId: "commit-1",
    effectKey: "effect-1",
    provenance,
    lifecycle: "durable",
    createdAt: new Date("2026-08-09T00:00:00.000Z"),
    ...overrides,
  };
}

describe("MemoryDecisionEvidenceBuilder", () => {
  it("ignores free-form memory text when no explicit decision tag exists", () => {
    const result = new MemoryDecisionEvidenceBuilder().build(
      [memory(["story:evidence-1"])],
      candidates,
      NOW,
    );

    expect(result).toEqual([]);
  });

  it("maps exact candidate and kind tags without inventing candidates", () => {
    const result = new MemoryDecisionEvidenceBuilder().build(
      [
        memory([
          "decision:kind:socialize:0.6",
          "decision:candidate:rest-1:-0.4",
          "decision:candidate:not-present:1",
        ]),
      ],
      candidates,
      NOW,
    );

    expect(result).toEqual([
      expect.objectContaining({
        effectiveSalience: 0.8,
        confidence: 0.75,
        candidateAffinity: {
          "join-friends-1": 0.6,
          "rest-1": -0.4,
        },
      }),
    ]);
  });

  it("averages multiple explicit tags deterministically", () => {
    const builder = new MemoryDecisionEvidenceBuilder();
    const input = memory([
      "decision:kind:socialize:0.8",
      "decision:candidate:join-friends-1:0.4",
      "decision:kind:socialize:not-a-number",
    ]);

    const first = builder.build([input], candidates, NOW);
    const second = builder.build([input], candidates, NOW);

    expect(first).toEqual(second);
    expect(first[0]?.candidateAffinity).toEqual({ "join-friends-1": 0.6 });
  });

  it("applies lifecycle decay to effective salience", () => {
    const result = new MemoryDecisionEvidenceBuilder().build(
      [
        memory(["decision:kind:rest:1"], {
          lifecycle: "decaying",
          salience: 1,
          createdAt: new Date("2026-08-03T00:00:00.000Z"),
        }),
      ],
      candidates,
      NOW,
    );

    expect(result[0]?.effectiveSalience).toBe(0.5);
  });
});
