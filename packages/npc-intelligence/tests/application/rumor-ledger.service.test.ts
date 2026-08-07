import { describe, expect, it } from "vitest";
import { RumorLedgerService } from "../../src/application/rumor-ledger.service";
import type { RumorLedgerEntry, RumorLedgerPort } from "../../src/ports/rumor-ledger.port";

const HOUSEHOLD = "hh-1";

class InMemoryRumorLedger implements RumorLedgerPort {
  entries = new Map<string, RumorLedgerEntry>();

  async recordPropagation(entry: RumorLedgerEntry): Promise<void> {
    const existing = this.entries.get(entry.propagationKey);
    if (existing) return;
    this.entries.set(entry.propagationKey, entry);
  }

  async hasPropagated(
    householdId: string,
    sourceNpcId: string,
    targetNpcId: string,
    factId: string,
  ): Promise<boolean> {
    const key = `pair:${sourceNpcId}:${targetNpcId}:${factId}`;
    const entry = this.entries.get(key);
    return entry !== undefined && entry.householdId === householdId;
  }

  async listPropagations(
    householdId: string,
  ): Promise<RumorLedgerEntry[]> {
    return [...this.entries.values()].filter(
      (e) => e.householdId === householdId,
    );
  }
}

describe("RumorLedgerService", () => {
  it("allows a first propagation for a source-target-fact triple", async () => {
    const ledger = new InMemoryRumorLedger();
    const service = new RumorLedgerService(ledger);
    const result = await service.gate({
      householdId: HOUSEHOLD,
      sourceNpcId: "npc-alpha",
      targetNpcId: "npc-beta",
      factId: "f-1",
    });
    expect(result.allowed).toBe(true);
    expect(result.duplicate).toBe(false);
  });

  it("blocks a duplicate propagation for the same source-target-fact triple", async () => {
    const ledger = new InMemoryRumorLedger();
    const service = new RumorLedgerService(ledger);
    await service.recordPropagation({
      householdId: HOUSEHOLD,
      sourceNpcId: "npc-alpha",
      targetNpcId: "npc-beta",
      factId: "f-1",
    });
    const result = await service.gate({
      householdId: HOUSEHOLD,
      sourceNpcId: "npc-alpha",
      targetNpcId: "npc-beta",
      factId: "f-1",
    });
    expect(result.allowed).toBe(false);
    expect(result.duplicate).toBe(true);
  });

  it("allows propagation to a different target NPC", async () => {
    const ledger = new InMemoryRumorLedger();
    const service = new RumorLedgerService(ledger);
    await service.recordPropagation({
      householdId: HOUSEHOLD,
      sourceNpcId: "npc-alpha",
      targetNpcId: "npc-beta",
      factId: "f-1",
    });
    const result = await service.gate({
      householdId: HOUSEHOLD,
      sourceNpcId: "npc-alpha",
      targetNpcId: "npc-gamma",
      factId: "f-1",
    });
    expect(result.allowed).toBe(true);
  });

  it("allows propagation of a different fact to the same target", async () => {
    const ledger = new InMemoryRumorLedger();
    const service = new RumorLedgerService(ledger);
    await service.recordPropagation({
      householdId: HOUSEHOLD,
      sourceNpcId: "npc-alpha",
      targetNpcId: "npc-beta",
      factId: "f-1",
    });
    const result = await service.gate({
      householdId: HOUSEHOLD,
      sourceNpcId: "npc-alpha",
      targetNpcId: "npc-beta",
      factId: "f-2",
    });
    expect(result.allowed).toBe(true);
  });

  it("is household-scoped (no cross-household dedup)", async () => {
    const ledger = new InMemoryRumorLedger();
    const service = new RumorLedgerService(ledger);
    await service.recordPropagation({
      householdId: HOUSEHOLD,
      sourceNpcId: "npc-alpha",
      targetNpcId: "npc-beta",
      factId: "f-1",
    });
    const result = await service.gate({
      householdId: "hh-other",
      sourceNpcId: "npc-alpha",
      targetNpcId: "npc-beta",
      factId: "f-1",
    });
    expect(result.allowed).toBe(true);
  });

  it("records propagation and confirms it exists", async () => {
    const ledger = new InMemoryRumorLedger();
    const service = new RumorLedgerService(ledger);
    await service.recordPropagation({
      householdId: HOUSEHOLD,
      sourceNpcId: "npc-alpha",
      targetNpcId: "npc-beta",
      factId: "f-1",
    });
    const propagations = await ledger.listPropagations(HOUSEHOLD);
    expect(propagations).toHaveLength(1);
    expect(propagations[0]!.sourceNpcId).toBe("npc-alpha");
    expect(propagations[0]!.targetNpcId).toBe("npc-beta");
    expect(propagations[0]!.factId).toBe("f-1");
  });

  it("is idempotent: recording the same propagation twice does not duplicate", async () => {
    const ledger = new InMemoryRumorLedger();
    const service = new RumorLedgerService(ledger);
    await service.recordPropagation({
      householdId: HOUSEHOLD,
      sourceNpcId: "npc-alpha",
      targetNpcId: "npc-beta",
      factId: "f-1",
    });
    await service.recordPropagation({
      householdId: HOUSEHOLD,
      sourceNpcId: "npc-alpha",
      targetNpcId: "npc-beta",
      factId: "f-1",
    });
    const propagations = await ledger.listPropagations(HOUSEHOLD);
    expect(propagations).toHaveLength(1);
  });
});