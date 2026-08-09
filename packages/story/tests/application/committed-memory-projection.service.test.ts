import { describe, expect, it, vi } from "vitest";

import { commitCanonicalMemories } from "../../src/application/committed-memory-projection.service";
import type { QueryExecutor } from "../../src/db/client";
import type { WorldChange } from "../../src/domain/outcome/world-commit-rule-engine";

function memoryChange(overrides: Partial<WorldChange> = {}): WorldChange {
  return {
    changeKey: "memory-001",
    entityId: "11111111-1111-4111-8111-111111111111",
    kind: "set",
    field: "memory.bridge",
    value: {
      summary: "Bora eski köprüde Arin'e verdiği sözü hatırlıyor.",
      kind: "promise",
      salience: 0.9,
      confidence: 0.95,
      lifecycle: "durable",
      provenance: ["scene:bridge"],
    },
    priority: 1,
    ruleId: "default-npc-memory",
    sequence: 0,
    evidenceRef: "scene:bridge:promise",
    status: "committed",
    ...overrides,
  };
}

function makeTx() {
  const execute = vi.fn().mockResolvedValue(undefined);
  return {
    execute,
  } as unknown as QueryExecutor & { execute: typeof execute };
}

describe("committed canonical memory projection", () => {
  it("writes committed npc memory changes through the caller transaction", async () => {
    const tx = makeTx();

    await commitCanonicalMemories({
      tx,
      householdId: "22222222-2222-4222-8222-222222222222",
      worldId: "33333333-3333-4333-8333-333333333333",
      childProfileId: "44444444-4444-4444-8444-444444444444",
      storySessionId: "55555555-5555-4555-8555-555555555555",
      outcomeId: "outcome-memory-001",
      commitId: "commit-memory-001",
      changes: [memoryChange()],
      createdAt: new Date("2026-08-09T18:00:00.000Z"),
    });

    expect(tx.execute).toHaveBeenCalledTimes(1);
  });

  it("does not write non-memory changes", async () => {
    const tx = makeTx();

    await commitCanonicalMemories({
      tx,
      householdId: "22222222-2222-4222-8222-222222222222",
      worldId: "33333333-3333-4333-8333-333333333333",
      storySessionId: "55555555-5555-4555-8555-555555555555",
      outcomeId: "outcome-memory-002",
      commitId: "commit-memory-002",
      changes: [memoryChange({ ruleId: "default-world-flag" })],
      createdAt: new Date("2026-08-09T18:00:00.000Z"),
    });

    expect(tx.execute).not.toHaveBeenCalled();
  });

  it("does not persist superseded memory changes", async () => {
    const tx = makeTx();

    await commitCanonicalMemories({
      tx,
      householdId: "22222222-2222-4222-8222-222222222222",
      worldId: "33333333-3333-4333-8333-333333333333",
      storySessionId: "55555555-5555-4555-8555-555555555555",
      outcomeId: "outcome-memory-003",
      commitId: "commit-memory-003",
      changes: [memoryChange({ status: "superseded" })],
      createdAt: new Date("2026-08-09T18:00:00.000Z"),
    });

    expect(tx.execute).not.toHaveBeenCalled();
  });

  it("rejects malformed structured memory before any persistence", async () => {
    const tx = makeTx();

    await expect(
      commitCanonicalMemories({
        tx,
        householdId: "22222222-2222-4222-8222-222222222222",
        worldId: "33333333-3333-4333-8333-333333333333",
        storySessionId: "55555555-5555-4555-8555-555555555555",
        outcomeId: "outcome-memory-004",
        commitId: "commit-memory-004",
        changes: [memoryChange({ value: { salience: 0.8 } })],
        createdAt: new Date("2026-08-09T18:00:00.000Z"),
      }),
    ).rejects.toThrow("MEMORY_PROJECTION_MISSING_SUMMARY");

    expect(tx.execute).not.toHaveBeenCalled();
  });
});
