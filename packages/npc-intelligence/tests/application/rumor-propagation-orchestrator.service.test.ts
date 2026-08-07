import { describe, expect, it } from "vitest";
import { RumorPropagationOrchestrator } from "../../src/application/rumor-propagation-orchestrator.service";
import { RumorPropagationEngine } from "../../src/application/rumor-propagation.service";
import { RumorLedgerService } from "../../src/application/rumor-ledger.service";
import { createRumor } from "../../src/domain/rumor";
import type { RumorLedgerPort } from "../../src/ports/rumor-ledger.port";
import type { StoryOutboxPort } from "../../src/ports/story-outbox.port";
import type { NpcCharacterSnapshot } from "../../src/ports/character-source.port";

const HOUSEHOLD = "hh-1";
const SOURCE_NPC = "npc-alpha";

function makeRumor(confidence = 1) {
  return createRumor({
    householdId: HOUSEHOLD,
    factId: "f-1",
    claim: "the bridge is weakened",
    originNpcId: SOURCE_NPC,
    confidence,
  });
}

function makeSnapshot(npcId: string): NpcCharacterSnapshot {
  return {
    npcId,
    householdId: HOUSEHOLD,
    traits: {},
    emotions: {},
    influence: {
      emotional: 0,
      social: 0,
      cultural: 0,
      educational: 0,
      political: 0,
      environmental: 0,
      familial: 0,
      spiritual: 0,
      historical: 0,
    },
    relationships: [],
    needs: [],
    goals: [],
  };
}

class InMemoryLedger implements RumorLedgerPort {
  propagations = new Map<string, boolean>();

  async recordPropagation(): Promise<void> {
    // no-op for this test
  }

  async gate(input: {
    householdId: string;
    sourceNpcId: string;
    targetNpcId: string;
    factId: string;
  }): Promise<{ allowed: boolean; duplicate: boolean }> {
    const key = `${input.householdId}:${input.sourceNpcId}:${input.targetNpcId}:${input.factId}`;
    const duplicate = this.propagations.get(key) ?? false;
    return { allowed: !duplicate, duplicate };
  }

  async hasPropagated(
    householdId: string,
    sourceNpcId: string,
    targetNpcId: string,
    factId: string,
  ): Promise<boolean> {
    const key = `${householdId}:${sourceNpcId}:${targetNpcId}:${factId}`;
    return this.propagations.get(key) ?? false;
  }

  async listPropagations(): Promise<never[]> {
    return [];
  }

  setPropagated(
    householdId: string,
    sourceNpcId: string,
    targetNpcId: string,
    factId: string,
  ): void {
    const key = `${householdId}:${sourceNpcId}:${targetNpcId}:${factId}`;
    this.propagations.set(key, true);
  }
}

class InMemoryOutbox implements StoryOutboxPort {
  enqueued: Array<{
    householdId: string;
    intentType: string;
    idempotencyKey: string;
  }> = [];

  async enqueue(intent: {
    householdId: string;
    intentType: string;
    idempotencyKey: string;
  }): Promise<void> {
    this.enqueued.push({
      householdId: intent.householdId,
      intentType: intent.intentType,
      idempotencyKey: intent.idempotencyKey,
    });
  }
}

describe("RumorPropagationOrchestrator", () => {
  it("enqueues propagation intents into the outbox", async () => {
    const engine = new RumorPropagationEngine();
    const ledger = new InMemoryLedger();
    const outbox = new InMemoryOutbox();
    const orchestrator = new RumorPropagationOrchestrator(
      engine,
      new RumorLedgerService(ledger),
      outbox,
    );

    const rumor = makeRumor();
    const result = await orchestrator.propagate({
      sourceNpcId: SOURCE_NPC,
      householdId: HOUSEHOLD,
      worldId: "world-1",
      commitId: "commit-1",
      rumor,
      characterSnapshots: new Map([["npc-beta", makeSnapshot("npc-beta")]]),
      nearbyCharacterIds: ["npc-beta"],
      relationshipTrust: { "npc-beta": 0.5 },
      elapsedMs: 0,
      seed: "test-seed",
    });

    expect(result.enqueued).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(outbox.enqueued).toHaveLength(1);
    expect(outbox.enqueued[0]!.intentType).toBe("npc_rumor_spread");
  });

  it("skips duplicate propagations via the ledger", async () => {
    const engine = new RumorPropagationEngine();
    const ledger = new InMemoryLedger();
    const outbox = new InMemoryOutbox();
    const orchestrator = new RumorPropagationOrchestrator(
      engine,
      new RumorLedgerService(ledger),
      outbox,
    );

    ledger.setPropagated(HOUSEHOLD, SOURCE_NPC, "npc-beta", "f-1");

    const rumor = makeRumor();
    const result = await orchestrator.propagate({
      sourceNpcId: SOURCE_NPC,
      householdId: HOUSEHOLD,
      worldId: "world-1",
      commitId: "commit-1",
      rumor,
      characterSnapshots: new Map([["npc-beta", makeSnapshot("npc-beta")]]),
      nearbyCharacterIds: ["npc-beta"],
      relationshipTrust: { "npc-beta": 0.5 },
      elapsedMs: 0,
      seed: "test-seed",
    });

    expect(result.enqueued).toBe(0);
    expect(result.skipped).toBe(1);
    expect(outbox.enqueued).toHaveLength(0);
  });

  it("records propagation in the ledger after enqueue", async () => {
    const engine = new RumorPropagationEngine();
    const ledger = new InMemoryLedger();
    const outbox = new InMemoryOutbox();
    const orchestrator = new RumorPropagationOrchestrator(
      engine,
      new RumorLedgerService(ledger),
      outbox,
    );

    const rumor = makeRumor();
    await orchestrator.propagate({
      sourceNpcId: SOURCE_NPC,
      householdId: HOUSEHOLD,
      worldId: "world-1",
      commitId: "commit-1",
      rumor,
      characterSnapshots: new Map([["npc-beta", makeSnapshot("npc-beta")]]),
      nearbyCharacterIds: ["npc-beta"],
      relationshipTrust: { "npc-beta": 0.5 },
      elapsedMs: 0,
      seed: "test-seed",
    });

    expect(outbox.enqueued).toHaveLength(1);
  });

  it("is household-scoped", async () => {
    const engine = new RumorPropagationEngine();
    const ledger = new InMemoryLedger();
    const outbox = new InMemoryOutbox();
    const orchestrator = new RumorPropagationOrchestrator(
      engine,
      new RumorLedgerService(ledger),
      outbox,
    );

    const rumor = makeRumor();
    const result = await orchestrator.propagate({
      sourceNpcId: SOURCE_NPC,
      householdId: HOUSEHOLD,
      worldId: "world-1",
      commitId: "commit-1",
      rumor,
      characterSnapshots: new Map([["npc-beta", makeSnapshot("npc-beta")]]),
      nearbyCharacterIds: ["npc-beta"],
      relationshipTrust: { "npc-beta": 0.5 },
      elapsedMs: 0,
      seed: "test-seed",
    });

    expect(result.enqueued).toBe(1);
    expect(outbox.enqueued[0]?.householdId).toBe(HOUSEHOLD);
  });
});
