import { describe, expect, it } from "vitest";

import {
  applyExistingCharacterMigrationToSandbox,
  auditExistingCharacterGenesis,
  buildExistingCharacterMigrationCandidate,
  createExistingCharacterMigrationPlan,
  createExistingCharacterRollbackManifest,
  fingerprintMigrationSnapshot,
  type ExistingCharacterBackfillProposal,
  type ExistingCharacterMigrationSnapshot,
} from "../../src/domain";

function snapshot(
  overrides: Partial<ExistingCharacterMigrationSnapshot> = {},
): ExistingCharacterMigrationSnapshot {
  return {
    householdId: "household-1",
    childProfileId: "child-1",
    characterId: "character-1",
    universeSeed: "universe-1",
    worldId: "world-1",
    existingSections: {
      origin: {
        summary: "Mira already lives in Silver Harbor.",
        narrative: "Mira has an established life in Silver Harbor.",
        facts: [
          {
            id: "origin-home",
            kind: "home",
            summary: "Mira lives in Silver Harbor.",
            visibility: "known_to_character",
            sourceRef: "story-12",
          },
        ],
        summaryFactIds: ["origin-home"],
        unresolvedQuestions: [],
        storyHooks: [],
      },
    },
    authoritativeFacts: [
      {
        path: "home.name",
        value: "Silver Harbor",
        authority: "story_history",
        sourceRef: "story-12",
      },
      {
        path: "inventory.compass.owner",
        value: "Mira",
        authority: "inventory_state",
        sourceRef: "item-compass",
      },
    ],
    ...overrides,
  };
}

function proposal(
  overrides: Partial<ExistingCharacterBackfillProposal> = {},
): ExistingCharacterBackfillProposal {
  return {
    id: "traits-from-history",
    section: "traits",
    summary: "Derive stable traits from repeated existing-story evidence.",
    value: {
      base: { curiosity: 0.8 },
      evidence: [],
      contextual: [],
      learnedModifiers: [],
      dynamic: {},
    },
    provenance: {
      kind: "directly_derived",
      confidence: 0.9,
      evidenceRefs: ["story-12", "story-15"],
      generatedAt: "2026-08-20T00:00:00.000Z",
    },
    assertions: [],
    ...overrides,
  };
}

describe("existing-character migration", () => {
  it("audits missing Genesis layers without making legacy characters unusable", () => {
    const audit = auditExistingCharacterGenesis(snapshot());

    expect(audit.complete).toBe(false);
    expect(audit.modeRecommendation).toBe("explicit_upgrade");
    expect(audit.missingSections).toEqual([
      "traits",
      "social",
      "inventory",
      "memoryAndThreads",
      "environment",
    ]);
  });

  it("never overwrites a Genesis section that is already canonical", () => {
    const plan = createExistingCharacterMigrationPlan({
      snapshot: snapshot(),
      mode: "explicit_upgrade",
      proposals: [
        proposal({
          id: "rewrite-origin",
          section: "origin",
          value: {
            summary: "A different childhood.",
            narrative: "Invented replacement history.",
            facts: [],
          },
          provenance: {
            kind: "newly_generated",
            confidence: 0.99,
            evidenceRefs: [],
            generatedAt: "2026-08-20T00:00:00.000Z",
          },
        }),
      ],
      now: "2026-08-20T00:00:00.000Z",
    });

    expect(plan.sandboxApplyAllowed).toBe(false);
    expect(plan.explicitUpgradeAllowed).toBe(false);
    expect(plan.conflicts.map((issue) => issue.code)).toContain(
      "MIGRATION_SECTION_ALREADY_CANONICAL",
    );
  });

  it("blocks a proposal that contradicts authoritative story or world history", () => {
    const plan = createExistingCharacterMigrationPlan({
      snapshot: snapshot(),
      mode: "explicit_upgrade",
      proposals: [
        proposal({
          assertions: [{ path: "home.name", value: "Northern Forest" }],
        }),
      ],
    });

    expect(plan.explicitUpgradeAllowed).toBe(false);
    expect(plan.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MIGRATION_CANONICAL_FACT_CONFLICT",
          path: "home.name",
          authoritativeSourceRef: "story-12",
        }),
      ]),
    );
  });

  it("blocks low-confidence inference even when no canonical fact conflicts", () => {
    const plan = createExistingCharacterMigrationPlan({
      snapshot: snapshot(),
      mode: "explicit_upgrade",
      proposals: [
        proposal({
          provenance: {
            kind: "inferred",
            confidence: 0.51,
            evidenceRefs: ["story-15"],
            generatedAt: "2026-08-20T00:00:00.000Z",
          },
        }),
      ],
    });

    expect(plan.sandboxApplyAllowed).toBe(false);
    expect(plan.conflicts.map((issue) => issue.code)).toContain(
      "MIGRATION_LOW_CONFIDENCE",
    );
  });

  it("requires human review before inferred mature history can be promoted", () => {
    const plan = createExistingCharacterMigrationPlan({
      snapshot: snapshot(),
      mode: "explicit_upgrade",
      proposals: [
        proposal({
          id: "social-inference",
          section: "social",
          value: { npcs: [], relationships: [] },
          provenance: {
            kind: "inferred",
            confidence: 0.92,
            evidenceRefs: ["story-2", "story-9"],
            generatedAt: "2026-08-20T00:00:00.000Z",
          },
        }),
      ],
    });

    expect(plan.sandboxApplyAllowed).toBe(true);
    expect(plan.requiresHumanReview).toBe(true);
    expect(plan.explicitUpgradeAllowed).toBe(false);
    expect(plan.conflicts.map((issue) => issue.code)).toContain(
      "MIGRATION_HISTORICAL_INFERENCE_REQUIRES_REVIEW",
    );
  });

  it("allows reviewed high-confidence historical inference only through explicit upgrade", () => {
    const reviewed = proposal({
      id: "social-reviewed",
      section: "social",
      value: { npcs: [], relationships: [] },
      reviewedByHuman: true,
      provenance: {
        kind: "inferred",
        confidence: 0.94,
        evidenceRefs: ["story-2", "story-9"],
        generatedAt: "2026-08-20T00:00:00.000Z",
      },
    });
    const lazy = createExistingCharacterMigrationPlan({
      snapshot: snapshot(),
      mode: "lazy_backfill",
      proposals: [reviewed],
    });
    const explicit = createExistingCharacterMigrationPlan({
      snapshot: snapshot(),
      mode: "explicit_upgrade",
      proposals: [reviewed],
    });

    expect(lazy.automaticPromotionAllowed).toBe(false);
    expect(lazy.explicitUpgradeAllowed).toBe(false);
    expect(explicit.explicitUpgradeAllowed).toBe(true);
  });

  it("is deterministic and idempotency-key stable for the same source snapshot", () => {
    const input = {
      snapshot: snapshot(),
      mode: "explicit_upgrade" as const,
      proposals: [proposal()],
      now: "2026-08-20T00:00:00.000Z",
    };
    const first = createExistingCharacterMigrationPlan(input);
    const second = createExistingCharacterMigrationPlan(input);

    expect(first.id).toBe(second.id);
    expect(first.idempotencyKey).toBe(second.idempotencyKey);
    expect(first.snapshotFingerprint).toBe(second.snapshotFingerprint);
  });

  it("refuses to apply a stale plan after canonical source state changes", () => {
    const source = snapshot();
    const plan = createExistingCharacterMigrationPlan({
      snapshot: source,
      mode: "explicit_upgrade",
      proposals: [proposal()],
    });
    const changed = snapshot({
      authoritativeFacts: [
        ...source.authoritativeFacts,
        {
          path: "world.region",
          value: "East Docks",
          authority: "world_state",
          sourceRef: "region-2",
        },
      ],
    });

    expect(() =>
      applyExistingCharacterMigrationToSandbox({ snapshot: changed, plan }),
    ).toThrow("Migration source changed after planning");
  });

  it("creates an auditable rollback manifest before sandbox/production upgrade", () => {
    const source = snapshot();
    const plan = createExistingCharacterMigrationPlan({
      snapshot: source,
      mode: "explicit_upgrade",
      proposals: [proposal()],
      now: "2026-08-20T00:00:00.000Z",
    });
    const rollback = createExistingCharacterRollbackManifest({
      snapshot: source,
      plan,
      now: "2026-08-20T00:00:00.000Z",
    });

    expect(rollback.beforeSnapshotFingerprint).toBe(
      fingerprintMigrationSnapshot(source),
    );
    expect(rollback.beforeSections.origin?.summary).toContain("Silver Harbor");
    expect(rollback.appliedSections).toEqual(["traits"]);
  });

  it("builds a staged migration candidate without mutating the source snapshot", () => {
    const source = snapshot();
    const plan = createExistingCharacterMigrationPlan({
      snapshot: source,
      mode: "explicit_upgrade",
      proposals: [proposal()],
      now: "2026-08-20T00:00:00.000Z",
    });
    const candidate = buildExistingCharacterMigrationCandidate({
      snapshot: source,
      plan,
      now: "2026-08-20T00:00:00.000Z",
    });

    expect(candidate.status).toBe("staged");
    expect(candidate.sections.origin?.summary).toContain("Silver Harbor");
    expect(candidate.sections.traits).toBeDefined();
    expect(candidate.provenance.derivationRevision).toBe(
      "existing-character-backfill.v1",
    );
    expect(source.existingSections?.traits).toBeUndefined();
  });

  it("recognizes an already-upgraded marker so repeated upgrades are not promoted", () => {
    const upgraded = snapshot({
      marker: {
        schemaRevision: "character-genesis.v1",
        migrationRevision: "existing-character-backfill.v1",
        migrationId: "migration-old",
      },
    });
    const audit = auditExistingCharacterGenesis(upgraded);
    const plan = createExistingCharacterMigrationPlan({
      snapshot: upgraded,
      mode: "explicit_upgrade",
      proposals: [proposal()],
    });

    expect(audit.alreadyUpgraded).toBe(true);
    expect(plan.explicitUpgradeAllowed).toBe(false);
  });
});
