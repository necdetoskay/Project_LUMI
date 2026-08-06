import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  IndirectEffectPropagator,
  type IndirectEffectApplicator,
} from "../../src/application/indirect-effect-propagator.service";

const mockRepo = {
  claimPendingOutbox: vi.fn(),
  markOutbox: vi.fn(),
  recordEvent: vi.fn(),
};

vi.mock("../../src/db/repositories/drizzle/drizzle-story.repository", () => ({
  DrizzleStoryRepository: class {
    claimPendingOutbox = mockRepo.claimPendingOutbox;
    markOutbox = mockRepo.markOutbox;
    recordEvent = mockRepo.recordEvent;
  },
}));

vi.mock("../../src/application/db", () => ({
  getStoryDb: () => ({
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  }),
}));

const HOUSEHOLD = "00000000-0000-4000-8000-000000000020";

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000070",
    householdId: HOUSEHOLD,
    worldId: "00000000-0000-4000-8000-000000000030",
    commitId: "00000000-0000-4000-8000-000000000060",
    idempotencyKey: "story-indirect:c1:rumor",
    intentType: "npc_rumor_spread",
    payload: { field: "need.hunger", value: 80 },
    evidenceRef: "r1",
    status: "pending",
    attemptCount: "0",
    lastError: null,
    appliedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeApplicator(fail = false): IndirectEffectApplicator {
  return {
    apply: vi.fn(async () => {
      if (fail) throw new Error("boom");
      return { writes: 1 };
    }),
  };
}

describe("IndirectEffectPropagator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.claimPendingOutbox.mockResolvedValue([]);
    mockRepo.markOutbox.mockResolvedValue({});
    mockRepo.recordEvent.mockResolvedValue({});
  });

  it("applies a pending intent and marks it applied", async () => {
    mockRepo.claimPendingOutbox.mockResolvedValue([makeRow()]);
    const applicator = makeApplicator();
    const propagator = new IndirectEffectPropagator(applicator);

    const result = await propagator.propagate({ householdId: HOUSEHOLD });

    expect(result).toEqual({ processed: 1, applied: 1, failed: 0, skipped: 0 });
    expect(applicator.apply).toHaveBeenCalledTimes(1);
    expect(mockRepo.markOutbox).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.objectContaining({ status: "applied", attemptCount: 1 }),
    );
    // Applied event recorded.
    const events = mockRepo.recordEvent.mock.calls.map(
      (call) => call[1].eventType,
    );
    expect(events).toContain("INDIRECT_EFFECT_APPLIED");
  });

  it("never re-applies an already-applied intent (idempotency)", async () => {
    mockRepo.claimPendingOutbox.mockResolvedValue([
      makeRow({ status: "applied", appliedAt: new Date() }),
    ]);
    const applicator = makeApplicator();
    const propagator = new IndirectEffectPropagator(applicator);

    const result = await propagator.propagate({ householdId: HOUSEHOLD });

    expect(result).toEqual({ processed: 1, applied: 0, failed: 0, skipped: 1 });
    expect(applicator.apply).not.toHaveBeenCalled();
  });

  it("isolates a failed intent: marks failed/retry, others proceed", async () => {
    mockRepo.claimPendingOutbox.mockResolvedValue([
      makeRow({ id: "bad", idempotencyKey: "k1" }),
      makeRow({
        id: "good",
        idempotencyKey: "k2",
        intentType: "npc_relationship_shift",
      }),
    ]);
    const applicator = {
      apply: vi.fn(async (row: { id: string }) => {
        if (row.id === "bad") throw new Error("boom");
        return { writes: 1 };
      }),
    };
    const propagator = new IndirectEffectPropagator(applicator);

    const result = await propagator.propagate({ householdId: HOUSEHOLD });

    expect(result.processed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.applied).toBe(1);
    expect(
      mockRepo.recordEvent.mock.calls.map((c) => c[1].eventType),
    ).toContain("INDIRECT_EFFECT_FAILED");
  });

  it("marks failed after max attempts and stops retrying", async () => {
    mockRepo.claimPendingOutbox.mockResolvedValue([
      makeRow({ status: "failed", attemptCount: "3" }),
    ]);
    const applicator = makeApplicator();
    const propagator = new IndirectEffectPropagator(applicator, 3);

    const result = await propagator.propagate({ householdId: HOUSEHOLD });

    expect(result.failed).toBe(1);
    expect(applicator.apply).not.toHaveBeenCalled();
    expect(mockRepo.markOutbox).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.objectContaining({
        status: "failed",
        lastError: "max attempts exceeded",
      }),
    );
  });
});
