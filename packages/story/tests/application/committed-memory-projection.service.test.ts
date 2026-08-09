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

function makeTx(results: unknown[] = [[], []]) {
  const execute = vi.fn();
  for (const result of results) execute.mockResolvedValueOnce(result);
  return {
    execute,
  } as unknown as QueryExecutor & { execute: typeof execute };
}

function input(tx: QueryExecutor, changes: WorldChange[]) {
  return {
    tx,
    householdId: "22222222-2222-4222-8222-222222222222",
    worldId: "33333333-3333-4333-8333-333333333333",
    childProfileId: "44444444-4444-4444-8444-444444444444",
    storySessionId: "55555555-5555-4555-8555-555555555555",
    outcomeId: "outcome-memory-001",
    commitId: "commit-memory-001",
    changes,
    createdAt: new Date("2026-08-09T18:00:00.000Z"),
  };
}

describe("committed canonical memory projection", () => {
  it("writes committed npc memory changes through the caller transaction", async () => {
    const tx = makeTx();

    await commitCanonicalMemories(input(tx, [memoryChange()]));

    expect(tx.execute).toHaveBeenCalledTimes(2);
  });

  it("absorbs replay before any supersession or duplicate insert", async () => {
    const tx = makeTx([[{ id: "existing-memory" }]]);

    await commitCanonicalMemories(input(tx, [memoryChange()]));

    expect(tx.execute).toHaveBeenCalledTimes(1);
  });

  it("supersedes an active prior memory before writing its replacement", async () => {
    const priorMemoryId = "66666666-6666-4666-8666-666666666666";
    const tx = makeTx([[], [{ id: priorMemoryId }], []]);
    const replacement = memoryChange({
      value: {
        summary: "Bora köprünün artık güvenli olduğunu öğrendi.",
        supersedesMemoryId: priorMemoryId,
      },
    });

    await commitCanonicalMemories(input(tx, [replacement]));

    expect(tx.execute).toHaveBeenCalledTimes(3);
  });

  it("rejects supersession when prior memory is outside the exact active scope", async () => {
    const tx = makeTx([[], []]);
    const replacement = memoryChange({
      value: {
        summary: "Bora köprünün artık güvenli olduğunu öğrendi.",
        supersedesMemoryId: "66666666-6666-4666-8666-666666666666",
      },
    });

    await expect(
      commitCanonicalMemories(input(tx, [replacement])),
    ).rejects.toThrow("MEMORY_SUPERSESSION_SCOPE_MISMATCH");
  });

  it("does not write non-memory changes", async () => {
    const tx = makeTx([]);

    await commitCanonicalMemories(
      input(tx, [memoryChange({ ruleId: "default-world-flag" })]),
    );

    expect(tx.execute).not.toHaveBeenCalled();
  });

  it("does not persist superseded world-change candidates", async () => {
    const tx = makeTx([]);

    await commitCanonicalMemories(
      input(tx, [memoryChange({ status: "superseded" })]),
    );

    expect(tx.execute).not.toHaveBeenCalled();
  });

  it("rejects malformed structured memory before any persistence", async () => {
    const tx = makeTx([]);

    await expect(
      commitCanonicalMemories(
        input(tx, [memoryChange({ value: { salience: 0.8 } })]),
      ),
    ).rejects.toThrow("MEMORY_PROJECTION_MISSING_SUMMARY");

    expect(tx.execute).not.toHaveBeenCalled();
  });
});
