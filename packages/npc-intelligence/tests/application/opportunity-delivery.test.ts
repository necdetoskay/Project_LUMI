import { describe, expect, it } from "vitest";
import { OpportunityDeliveryService } from "../../src/application/opportunity-delivery.service";
import type { OpportunityInboxPort } from "../../src/ports/opportunity-inbox.port";
import { InteractionOpportunity } from "../../src/domain/opportunity";

const HOUSEHOLD = "hh-1";
const NPC = "npc-1";
const CHILD = "child-1";
// Fixed instant used for response/expiry bookkeeping in the in-memory inbox.
const NOW = new Date("2026-08-06T12:00:00Z");

class InMemoryInbox implements OpportunityInboxPort {
  items = new Map<string, InteractionOpportunity>();
  statuses = new Map<string, string>();

  async deliver(o: InteractionOpportunity): Promise<void> {
    this.items.set(o.id, o);
  }
  async findByIdempotencyKey(
    householdId: string,
    key: string,
  ): Promise<InteractionOpportunity | undefined> {
    return [...this.items.values()].find(
      (o) => o.householdId === householdId && o.cooldownKeys.includes(key),
    );
  }
  async listProposedForChild(
    householdId: string,
    childProfileId: string,
    now: Date,
  ): Promise<InteractionOpportunity[]> {
    return [...this.items.values()].filter(
      (o) =>
        o.householdId === householdId &&
        o.childProfileId === childProfileId &&
        o.status === "proposed" &&
        o.expiresAt > now,
    );
  }
  async transitionStatus(
    opportunityId: string,
    status: Parameters<OpportunityInboxPort["transitionStatus"]>[1],
    now: Date,
  ): Promise<void> {
    void now;
    const item = this.items.get(opportunityId);
    if (item) {
      this.statuses.set(opportunityId, status);
    }
  }
  async markExpired(
    householdId: string,
    childProfileId: string,
    now: Date,
  ): Promise<number> {
    let count = 0;
    for (const item of this.items.values()) {
      if (
        item.householdId === householdId &&
        item.childProfileId === childProfileId &&
        item.status === "proposed" &&
        item.expiresAt <= now
      ) {
        this.statuses.set(item.id, "expired");
        count += 1;
      }
    }
    return count;
  }
}

function makeOpportunity(overrides: Record<string, unknown> = {}) {
  return InteractionOpportunity.create({
    householdId: HOUSEHOLD,
    sourceNpcId: NPC,
    childProfileId: CHILD,
    opportunityType: "rumor",
    message: "The bridge by the mill is damaged.",
    evidence: { beliefId: "b-1" },
    score: 0.8,
    cooldownKeys: ["npc-1:child-1:rumor"],
    expiresAt: new Date(Date.now() + 60_000),
    reason: "rumor about world event",
    ...(overrides as object),
  });
}

describe("OpportunityDeliveryService", () => {
  it("delivers an opportunity", async () => {
    const inbox = new InMemoryInbox();
    const service = new OpportunityDeliveryService(inbox);
    const o = makeOpportunity();
    const result = await service.deliver({
      householdId: HOUSEHOLD,
      idempotencyKey: "npc-1:child-1:rumor",
      opportunity: o,
    });
    expect(result).toBe("delivered");
    expect(inbox.items.has(o.id)).toBe(true);
  });

  it("is idempotent: same key returns duplicate, delivers once", async () => {
    const inbox = new InMemoryInbox();
    const service = new OpportunityDeliveryService(inbox);
    const o = makeOpportunity();
    const first = await service.deliver({
      householdId: HOUSEHOLD,
      idempotencyKey: "npc-1:child-1:rumor",
      opportunity: o,
    });
    const second = await service.deliver({
      householdId: HOUSEHOLD,
      idempotencyKey: "npc-1:child-1:rumor",
      opportunity: makeOpportunity(),
    });
    expect(first).toBe("delivered");
    expect(second).toBe("duplicate");
    expect(inbox.items.size).toBe(1);
  });

  it("rejects delivering an already-expired opportunity", async () => {
    const inbox = new InMemoryInbox();
    const service = new OpportunityDeliveryService(inbox);
    const o = makeOpportunity({
      expiresAt: new Date(Date.now() - 5000),
    });
    await expect(
      service.deliver({
        householdId: HOUSEHOLD,
        idempotencyKey: "k",
        opportunity: o,
      }),
    ).rejects.toThrow("Opportunity already expired at delivery time");
  });

  it("transitions status on child response", async () => {
    const inbox = new InMemoryInbox();
    const service = new OpportunityDeliveryService(inbox);
    const o = makeOpportunity();
    await inbox.deliver(o);
    await service.respond(HOUSEHOLD, o.id, "declined", NOW);
    expect(inbox.statuses.get(o.id)).toBe("declined");
  });

  it("marks stale proposed opportunities as expired", async () => {
    const inbox = new InMemoryInbox();
    const service = new OpportunityDeliveryService(inbox);
    const fresh = makeOpportunity();
    const stale = makeOpportunity({
      expiresAt: new Date(Date.now() - 5000),
    });
    await inbox.deliver(fresh);
    await inbox.deliver(stale);
    const count = await service.expireStale(HOUSEHOLD, CHILD, new Date());
    expect(count).toBe(1);
    expect(inbox.statuses.get(stale.id)).toBe("expired");
    expect(inbox.statuses.get(fresh.id)).toBeUndefined();
  });

  it("enforces household isolation on delivery", async () => {
    const inbox = new InMemoryInbox();
    const service = new OpportunityDeliveryService(inbox);
    const o = makeOpportunity();
    await expect(
      service.deliver({
        householdId: "hh-other",
        idempotencyKey: "k",
        opportunity: o,
      }),
    ).rejects.toThrow(
      "Opportunity household does not match delivery household",
    );
  });
});
