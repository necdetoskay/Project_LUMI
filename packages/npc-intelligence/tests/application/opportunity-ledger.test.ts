import { describe, expect, it } from "vitest";
import {
  OpportunityLedgerService,
  DEFAULT_COOLDOWN_MS,
} from "../../src/application/opportunity-ledger.service";
import type {
  CooldownEntry,
  NoveltyEntry,
  OpportunityLedgerPort,
} from "../../src/ports/opportunity-ledger.port";

const HOUSEHOLD = "hh-1";
const NOW = new Date("2026-08-06T12:00:00Z");

class InMemoryLedger implements OpportunityLedgerPort {
  cooldowns = new Map<string, CooldownEntry>();
  novelties = new Map<string, NoveltyEntry>();

  async recordCooldown(entry: CooldownEntry): Promise<void> {
    this.cooldowns.set(`${entry.householdId}:${entry.cooldownKey}`, entry);
  }
  async getCooldown(
    householdId: string,
    cooldownKey: string,
  ): Promise<CooldownEntry | undefined> {
    return this.cooldowns.get(`${householdId}:${cooldownKey}`);
  }
  async listActiveCooldowns(
    householdId: string,
    now: Date,
  ): Promise<CooldownEntry[]> {
    return [...this.cooldowns.values()].filter(
      (e) => e.householdId === householdId && e.expiresAt > now,
    );
  }
  async recordNovelty(entry: NoveltyEntry): Promise<NoveltyEntry> {
    this.novelties.set(`${entry.householdId}:${entry.noveltyKey}`, entry);
    return entry;
  }
  async getNovelty(
    householdId: string,
    noveltyKey: string,
  ): Promise<NoveltyEntry | undefined> {
    return this.novelties.get(`${householdId}:${noveltyKey}`);
  }
}

describe("OpportunityLedgerService", () => {
  it("allows when no cooldown and low novelty", async () => {
    const ledger = new InMemoryLedger();
    const service = new OpportunityLedgerService(ledger);
    const result = await service.gate({
      householdId: HOUSEHOLD,
      cooldownKeys: ["source:npc-1:rumor"],
      noveltyKey: "npc-1:rumor",
      now: NOW,
    });
    expect(result.allowed).toBe(true);
    expect(result.cooldownBlocked).toBe(false);
    expect(result.noveltyBlocked).toBe(false);
  });

  it("blocks a key that is still cooling down", async () => {
    const ledger = new InMemoryLedger();
    await ledger.recordCooldown({
      id: "c-1",
      householdId: HOUSEHOLD,
      cooldownKey: "source:npc-1:rumor",
      expiresAt: new Date(NOW.getTime() + DEFAULT_COOLDOWN_MS),
      createdAt: NOW,
    });
    const service = new OpportunityLedgerService(ledger);
    const result = await service.gate({
      householdId: HOUSEHOLD,
      cooldownKeys: ["source:npc-1:rumor"],
      noveltyKey: "npc-1:rumor",
      now: NOW,
    });
    expect(result.cooldownBlocked).toBe(true);
    expect(result.blockedCooldownKeys).toEqual(["source:npc-1:rumor"]);
    expect(result.allowed).toBe(false);
  });

  it("ignores expired cooldowns (silently)", async () => {
    const ledger = new InMemoryLedger();
    await ledger.recordCooldown({
      id: "c-1",
      householdId: HOUSEHOLD,
      cooldownKey: "source:npc-1:rumor",
      expiresAt: new Date(NOW.getTime() - 1000),
      createdAt: new Date(NOW.getTime() - 7200_000),
    });
    const service = new OpportunityLedgerService(ledger);
    const result = await service.gate({
      householdId: HOUSEHOLD,
      cooldownKeys: ["source:npc-1:rumor"],
      noveltyKey: "npc-1:rumor",
      now: NOW,
    });
    expect(result.cooldownBlocked).toBe(false);
    expect(result.allowed).toBe(true);
  });

  it("blocks once novelty count reaches the threshold", async () => {
    const ledger = new InMemoryLedger();
    await ledger.recordNovelty({
      id: "n-1",
      householdId: HOUSEHOLD,
      noveltyKey: "npc-1:rumor",
      firedCount: 5,
      lastFiredAt: NOW,
    });
    const service = new OpportunityLedgerService(ledger);
    const result = await service.gate({
      householdId: HOUSEHOLD,
      cooldownKeys: [],
      noveltyKey: "npc-1:rumor",
      maxNovelty: 5,
      now: NOW,
    });
    expect(result.noveltyBlocked).toBe(true);
    expect(result.allowed).toBe(false);
  });

  it("records a fired opportunity: cooldown + novelty increment", async () => {
    const ledger = new InMemoryLedger();
    const service = new OpportunityLedgerService(ledger);
    await service.recordFired({
      householdId: HOUSEHOLD,
      cooldownKeys: ["source:npc-1:rumor"],
      noveltyKey: "npc-1:rumor",
      now: NOW,
    });

    const cooldown = await ledger.getCooldown(HOUSEHOLD, "source:npc-1:rumor");
    expect(cooldown?.expiresAt).toBeDefined();
    expect(cooldown!.expiresAt > NOW).toBe(true);

    const novelty = await ledger.getNovelty(HOUSEHOLD, "npc-1:rumor");
    expect(novelty?.firedCount).toBe(1);

    // Second fire increments to 2.
    await service.recordFired({
      householdId: HOUSEHOLD,
      cooldownKeys: ["source:npc-1:rumor"],
      noveltyKey: "npc-1:rumor",
      now: new Date(NOW.getTime() + 7200_000),
    });
    const novelty2 = await ledger.getNovelty(HOUSEHOLD, "npc-1:rumor");
    expect(novelty2?.firedCount).toBe(2);
  });

  it("is household-scoped (no cross-household cooldown)", async () => {
    const ledger = new InMemoryLedger();
    await ledger.recordCooldown({
      id: "c-1",
      householdId: "hh-other",
      cooldownKey: "source:npc-1:rumor",
      expiresAt: new Date(NOW.getTime() + DEFAULT_COOLDOWN_MS),
      createdAt: NOW,
    });
    const service = new OpportunityLedgerService(ledger);
    const result = await service.gate({
      householdId: HOUSEHOLD,
      cooldownKeys: ["source:npc-1:rumor"],
      noveltyKey: "npc-1:rumor",
      now: NOW,
    });
    expect(result.cooldownBlocked).toBe(false);
    expect(result.allowed).toBe(true);
  });
});
