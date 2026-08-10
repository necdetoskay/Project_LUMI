import { describe, expect, it, vi } from "vitest";
import { NpcDecisionMemoryContextService } from "../../src/application/npc-decision-memory-context.service";
import type { CanonicalMemory } from "../../src/domain";
import type { CanonicalMemoryPort } from "../../src/ports/canonical-memory.port";

const NOW = new Date("2026-08-10T00:00:00.000Z");

function makeMemory(): CanonicalMemory {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    householdId: "22222222-2222-4222-8222-222222222222",
    worldId: "33333333-3333-4333-8333-333333333333",
    childProfileId: "44444444-4444-4444-8444-444444444444",
    ownerType: "npc",
    ownerId: "55555555-5555-4555-8555-555555555555",
    kind: "experience",
    summary: "A remembered moment.",
    salience: 0.9,
    confidence: 0.8,
    sourceType: "story_outcome",
    sourceId: "commit-1",
    effectKey: "effect-1",
    provenance: ["decision:kind:socialize:0.75"],
    lifecycle: "durable",
    createdAt: new Date("2026-08-09T00:00:00.000Z"),
  };
}

describe("NpcDecisionMemoryContextService", () => {
  it("queries canonical memory with exact household/world/profile/NPC scope", async () => {
    const listRelevant = vi.fn().mockResolvedValue([makeMemory()]);
    const port = {
      listRelevant,
      save: vi.fn(),
      reinforce: vi.fn(),
      reinforceForScene: vi.fn(),
      archive: vi.fn(),
    } satisfies CanonicalMemoryPort;

    const result = await new NpcDecisionMemoryContextService(port).resolve({
      householdId: "22222222-2222-4222-8222-222222222222",
      worldId: "33333333-3333-4333-8333-333333333333",
      childProfileId: "44444444-4444-4444-8444-444444444444",
      npcId: "55555555-5555-4555-8555-555555555555",
      candidates: [
        {
          id: "join-1",
          kind: "socialize",
          description: "Join friends",
          requiredFactIds: [],
          targetCharacterId: null,
          needTypes: ["belonging"],
          personalityFit: 0.8,
          safety: "safe",
        },
      ],
      now: NOW,
    });

    expect(listRelevant).toHaveBeenCalledWith({
      householdId: "22222222-2222-4222-8222-222222222222",
      worldId: "33333333-3333-4333-8333-333333333333",
      childProfileId: "44444444-4444-4444-8444-444444444444",
      ownerType: "npc",
      ownerId: "55555555-5555-4555-8555-555555555555",
      now: NOW,
      limit: 8,
    });
    expect(result[0]?.candidateAffinity).toEqual({ "join-1": 0.75 });
  });
});
