import {
  createCharacterGenesisPackage,
  type CharacterGenesisPackage,
  type CharacterGenesisSections,
  type GenesisProvenance,
} from "./character-genesis";

export const EXISTING_CHARACTER_MIGRATION_MODES = [
  "legacy_read_only",
  "lazy_backfill",
  "explicit_upgrade",
] as const;

export type ExistingCharacterMigrationMode =
  (typeof EXISTING_CHARACTER_MIGRATION_MODES)[number];

export const MIGRATION_PROVENANCE_KINDS = [
  "pre_existing",
  "directly_derived",
  "inferred",
  "newly_generated",
  "human_confirmed",
] as const;

export type MigrationProvenanceKind =
  (typeof MIGRATION_PROVENANCE_KINDS)[number];

export const EXISTING_CHARACTER_MIGRATION_REVISION =
  "existing-character-backfill.v1";
export const EXISTING_CHARACTER_TARGET_SCHEMA_REVISION = "character-genesis.v1";

export const CHARACTER_GENESIS_SECTION_KEYS = [
  "origin",
  "traits",
  "social",
  "inventory",
  "memoryAndThreads",
  "environment",
] as const satisfies readonly (keyof CharacterGenesisSections)[];

export type CharacterGenesisSectionKey =
  (typeof CHARACTER_GENESIS_SECTION_KEYS)[number];

export type ExistingCharacterFactAuthority =
  | "character_profile"
  | "story_history"
  | "world_state"
  | "npc_state"
  | "inventory_state"
  | "memory_state"
  | "legacy_foundation"
  | "human_confirmation";

export interface ExistingCharacterCanonicalFact {
  path: string;
  value: unknown;
  authority: ExistingCharacterFactAuthority;
  sourceRef: string;
}

export interface ExistingCharacterMigrationMarker {
  schemaRevision?: string;
  migrationRevision?: string;
  migrationId?: string;
  upgradedAt?: string;
}

export interface ExistingCharacterMigrationSnapshot {
  householdId: string;
  childProfileId: string;
  characterId: string;
  universeSeed: string;
  worldId?: string;
  currentGenesis?: CharacterGenesisPackage | null;
  existingSections?: CharacterGenesisSections;
  authoritativeFacts: ExistingCharacterCanonicalFact[];
  marker?: ExistingCharacterMigrationMarker;
}

export interface MigrationSectionCoverage {
  section: CharacterGenesisSectionKey;
  status: "present" | "missing";
}

export interface ExistingCharacterMigrationAudit {
  characterId: string;
  modeRecommendation: "legacy_read_only" | "explicit_upgrade";
  coverage: MigrationSectionCoverage[];
  missingSections: CharacterGenesisSectionKey[];
  complete: boolean;
  alreadyUpgraded: boolean;
  snapshotFingerprint: string;
}

export interface MigrationFactAssertion {
  path: string;
  value: unknown;
}

export interface MigrationProposalProvenance {
  kind: MigrationProvenanceKind;
  confidence: number;
  evidenceRefs: string[];
  generatedAt: string;
  modelProvider?: string;
  modelId?: string;
  promptRevision?: string;
}

export interface ExistingCharacterBackfillProposal {
  id: string;
  section: CharacterGenesisSectionKey;
  value: unknown;
  summary: string;
  provenance: MigrationProposalProvenance;
  assertions: MigrationFactAssertion[];
  reviewedByHuman?: boolean;
}

export interface ExistingCharacterMigrationConflict {
  code:
    | "MIGRATION_SECTION_ALREADY_CANONICAL"
    | "MIGRATION_CANONICAL_FACT_CONFLICT"
    | "MIGRATION_LOW_CONFIDENCE"
    | "MIGRATION_EVIDENCE_REQUIRED"
    | "MIGRATION_HISTORICAL_INFERENCE_REQUIRES_REVIEW"
    | "MIGRATION_NEW_HISTORY_REQUIRES_REVIEW";
  message: string;
  severity: "error" | "warning";
  section?: CharacterGenesisSectionKey;
  path?: string;
  authoritativeSourceRef?: string;
  proposalId?: string;
}

export interface ExistingCharacterMigrationPlan {
  id: string;
  mode: ExistingCharacterMigrationMode;
  migrationRevision: string;
  targetSchemaRevision: string;
  characterId: string;
  snapshotFingerprint: string;
  idempotencyKey: string;
  missingSections: CharacterGenesisSectionKey[];
  proposals: ExistingCharacterBackfillProposal[];
  conflicts: ExistingCharacterMigrationConflict[];
  requiresHumanReview: boolean;
  sandboxApplyAllowed: boolean;
  automaticPromotionAllowed: false;
  explicitUpgradeAllowed: boolean;
  createdAt: string;
}

export interface ExistingCharacterRollbackManifest {
  migrationId: string;
  characterId: string;
  migrationRevision: string;
  beforeSnapshotFingerprint: string;
  beforeSections: CharacterGenesisSections;
  beforeMarker?: ExistingCharacterMigrationMarker;
  appliedProposalIds: string[];
  appliedSections: CharacterGenesisSectionKey[];
  createdAt: string;
}

const HISTORICAL_SECTIONS = new Set<CharacterGenesisSectionKey>([
  "origin",
  "social",
  "inventory",
]);

export function auditExistingCharacterGenesis(
  snapshot: ExistingCharacterMigrationSnapshot,
): ExistingCharacterMigrationAudit {
  assertSnapshotScope(snapshot);
  const sections = readExistingSections(snapshot);
  const coverage = CHARACTER_GENESIS_SECTION_KEYS.map((section) => ({
    section,
    status: sections[section] === undefined ? "missing" : "present",
  })) satisfies MigrationSectionCoverage[];
  const missingSections = coverage
    .filter((entry) => entry.status === "missing")
    .map((entry) => entry.section);
  const alreadyUpgraded =
    snapshot.marker?.migrationRevision ===
      EXISTING_CHARACTER_MIGRATION_REVISION ||
    snapshot.currentGenesis?.provenance.derivationRevision ===
      EXISTING_CHARACTER_MIGRATION_REVISION;

  return {
    characterId: snapshot.characterId,
    modeRecommendation:
      missingSections.length === 0 ? "legacy_read_only" : "explicit_upgrade",
    coverage,
    missingSections,
    complete: missingSections.length === 0,
    alreadyUpgraded,
    snapshotFingerprint: fingerprintMigrationSnapshot(snapshot),
  };
}

export function createExistingCharacterMigrationPlan(input: {
  id?: string;
  snapshot: ExistingCharacterMigrationSnapshot;
  mode: ExistingCharacterMigrationMode;
  proposals: ExistingCharacterBackfillProposal[];
  now?: string;
}): ExistingCharacterMigrationPlan {
  if (!EXISTING_CHARACTER_MIGRATION_MODES.includes(input.mode)) {
    throw new Error(
      `Unsupported existing-character migration mode: ${input.mode}`,
    );
  }
  const audit = auditExistingCharacterGenesis(input.snapshot);
  const now = input.now ?? new Date().toISOString();
  const proposals = structuredClone(input.proposals).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const conflicts = detectExistingCharacterMigrationConflicts(
    input.snapshot,
    proposals,
  );
  const blockingConflict = conflicts.some(
    (issue) => issue.severity === "error",
  );
  const requiresHumanReview = conflicts.some(
    (issue) =>
      issue.code === "MIGRATION_HISTORICAL_INFERENCE_REQUIRES_REVIEW" ||
      issue.code === "MIGRATION_NEW_HISTORY_REQUIRES_REVIEW",
  );
  const id =
    input.id ??
    `migration-${stableHash({
      characterId: input.snapshot.characterId,
      snapshotFingerprint: audit.snapshotFingerprint,
      proposals,
    })}`;
  const idempotencyKey = `existing-character-genesis:${input.snapshot.characterId}:${EXISTING_CHARACTER_MIGRATION_REVISION}:${audit.snapshotFingerprint}`;
  const explicitUpgradeAllowed =
    input.mode === "explicit_upgrade" &&
    !blockingConflict &&
    !requiresHumanReview &&
    !audit.alreadyUpgraded;

  return {
    id,
    mode: input.mode,
    migrationRevision: EXISTING_CHARACTER_MIGRATION_REVISION,
    targetSchemaRevision: EXISTING_CHARACTER_TARGET_SCHEMA_REVISION,
    characterId: input.snapshot.characterId,
    snapshotFingerprint: audit.snapshotFingerprint,
    idempotencyKey,
    missingSections: audit.missingSections,
    proposals,
    conflicts,
    requiresHumanReview,
    sandboxApplyAllowed: !blockingConflict,
    automaticPromotionAllowed: false,
    explicitUpgradeAllowed,
    createdAt: now,
  };
}

export function detectExistingCharacterMigrationConflicts(
  snapshot: ExistingCharacterMigrationSnapshot,
  proposals: ExistingCharacterBackfillProposal[],
): ExistingCharacterMigrationConflict[] {
  const issues: ExistingCharacterMigrationConflict[] = [];
  const existingSections = readExistingSections(snapshot);
  const canonicalFacts = new Map(
    snapshot.authoritativeFacts.map((fact) => [fact.path, fact] as const),
  );

  for (const proposal of proposals) {
    validateProposalBasics(proposal);

    if (existingSections[proposal.section] !== undefined) {
      issues.push({
        code: "MIGRATION_SECTION_ALREADY_CANONICAL",
        message: `Migration cannot overwrite existing Genesis section ${proposal.section}`,
        severity: "error",
        section: proposal.section,
        proposalId: proposal.id,
      });
    }

    if (
      proposal.provenance.kind !== "newly_generated" &&
      proposal.provenance.kind !== "human_confirmed" &&
      proposal.provenance.evidenceRefs.length === 0
    ) {
      issues.push({
        code: "MIGRATION_EVIDENCE_REQUIRED",
        message: `Proposal ${proposal.id} requires evidence references for provenance ${proposal.provenance.kind}`,
        severity: "error",
        section: proposal.section,
        proposalId: proposal.id,
      });
    }

    if (
      proposal.provenance.kind === "inferred" &&
      proposal.provenance.confidence < 0.75
    ) {
      issues.push({
        code: "MIGRATION_LOW_CONFIDENCE",
        message: `Proposal ${proposal.id} confidence ${proposal.provenance.confidence} is below the migration threshold`,
        severity: "error",
        section: proposal.section,
        proposalId: proposal.id,
      });
    }

    if (
      HISTORICAL_SECTIONS.has(proposal.section) &&
      proposal.provenance.kind === "inferred" &&
      !proposal.reviewedByHuman
    ) {
      issues.push({
        code: "MIGRATION_HISTORICAL_INFERENCE_REQUIRES_REVIEW",
        message: `Inferred historical section ${proposal.section} requires human review before promotion`,
        severity: "warning",
        section: proposal.section,
        proposalId: proposal.id,
      });
    }

    if (
      HISTORICAL_SECTIONS.has(proposal.section) &&
      proposal.provenance.kind === "newly_generated" &&
      !proposal.reviewedByHuman
    ) {
      issues.push({
        code: "MIGRATION_NEW_HISTORY_REQUIRES_REVIEW",
        message: `Newly generated historical section ${proposal.section} cannot be promoted without human review`,
        severity: "warning",
        section: proposal.section,
        proposalId: proposal.id,
      });
    }

    for (const assertion of proposal.assertions) {
      const authoritative = canonicalFacts.get(assertion.path);
      if (!authoritative) continue;
      if (
        stableStringify(authoritative.value) ===
        stableStringify(assertion.value)
      ) {
        continue;
      }
      issues.push({
        code: "MIGRATION_CANONICAL_FACT_CONFLICT",
        message: `Proposal ${proposal.id} conflicts with authoritative fact ${assertion.path}`,
        severity: "error",
        section: proposal.section,
        path: assertion.path,
        authoritativeSourceRef: authoritative.sourceRef,
        proposalId: proposal.id,
      });
    }
  }

  return issues;
}

export function applyExistingCharacterMigrationToSandbox(input: {
  snapshot: ExistingCharacterMigrationSnapshot;
  plan: ExistingCharacterMigrationPlan;
}): CharacterGenesisSections {
  assertPlanMatchesSnapshot(input.snapshot, input.plan);
  if (!input.plan.sandboxApplyAllowed) {
    throw new Error("Blocked existing-character migration cannot be applied");
  }

  const sections = structuredClone(readExistingSections(input.snapshot));
  for (const proposal of input.plan.proposals) {
    if (sections[proposal.section] !== undefined) {
      throw new Error(
        `Existing Genesis section ${proposal.section} cannot be overwritten by migration`,
      );
    }
    assignSection(sections, proposal.section, proposal.value);
  }
  return sections;
}

export function buildExistingCharacterMigrationCandidate(input: {
  snapshot: ExistingCharacterMigrationSnapshot;
  plan: ExistingCharacterMigrationPlan;
  now?: string;
}): CharacterGenesisPackage {
  const now = input.now ?? new Date().toISOString();
  const sections = applyExistingCharacterMigrationToSandbox(input);
  const provenance: GenesisProvenance = {
    schemaRevision: input.plan.targetSchemaRevision,
    derivationRevision: input.plan.migrationRevision,
    validationRevision: "cross-domain.v1",
    seed: input.plan.idempotencyKey,
    generatedAt: now,
  };

  return createCharacterGenesisPackage({
    id: `migration-genesis-${stableHash({
      characterId: input.snapshot.characterId,
      migrationId: input.plan.id,
    })}`,
    householdId: input.snapshot.householdId,
    childProfileId: input.snapshot.childProfileId,
    characterId: input.snapshot.characterId,
    universeSeed: input.snapshot.universeSeed,
    candidateSeed: input.plan.idempotencyKey,
    provenance,
    sections,
    now,
  });
}

export function createExistingCharacterRollbackManifest(input: {
  snapshot: ExistingCharacterMigrationSnapshot;
  plan: ExistingCharacterMigrationPlan;
  now?: string;
}): ExistingCharacterRollbackManifest {
  assertPlanMatchesSnapshot(input.snapshot, input.plan);
  return {
    migrationId: input.plan.id,
    characterId: input.snapshot.characterId,
    migrationRevision: input.plan.migrationRevision,
    beforeSnapshotFingerprint: input.plan.snapshotFingerprint,
    beforeSections: structuredClone(readExistingSections(input.snapshot)),
    ...(input.snapshot.marker
      ? { beforeMarker: structuredClone(input.snapshot.marker) }
      : {}),
    appliedProposalIds: input.plan.proposals.map((proposal) => proposal.id),
    appliedSections: input.plan.proposals.map((proposal) => proposal.section),
    createdAt: input.now ?? new Date().toISOString(),
  };
}

export function fingerprintMigrationSnapshot(
  snapshot: ExistingCharacterMigrationSnapshot,
): string {
  return stableHash({
    householdId: snapshot.householdId,
    childProfileId: snapshot.childProfileId,
    characterId: snapshot.characterId,
    universeSeed: snapshot.universeSeed,
    worldId: snapshot.worldId ?? null,
    currentGenesis: snapshot.currentGenesis
      ? {
          id: snapshot.currentGenesis.id,
          version: snapshot.currentGenesis.version,
          status: snapshot.currentGenesis.status,
          sections: snapshot.currentGenesis.sections,
        }
      : null,
    existingSections: snapshot.existingSections ?? null,
    authoritativeFacts: [...snapshot.authoritativeFacts].sort((a, b) =>
      `${a.path}:${a.sourceRef}`.localeCompare(`${b.path}:${b.sourceRef}`),
    ),
    marker: snapshot.marker ?? null,
  });
}

function readExistingSections(
  snapshot: ExistingCharacterMigrationSnapshot,
): CharacterGenesisSections {
  return structuredClone(
    snapshot.currentGenesis?.sections ?? snapshot.existingSections ?? {},
  );
}

function validateProposalBasics(proposal: ExistingCharacterBackfillProposal) {
  if (!proposal.id.trim()) throw new Error("Migration proposal id is required");
  if (!CHARACTER_GENESIS_SECTION_KEYS.includes(proposal.section)) {
    throw new Error(`Unsupported migration section ${proposal.section}`);
  }
  if (
    !Number.isFinite(proposal.provenance.confidence) ||
    proposal.provenance.confidence < 0 ||
    proposal.provenance.confidence > 1
  ) {
    throw new Error(
      `Migration proposal ${proposal.id} confidence must be within [0,1]`,
    );
  }
}

function assertSnapshotScope(snapshot: ExistingCharacterMigrationSnapshot) {
  for (const [field, value] of Object.entries({
    householdId: snapshot.householdId,
    childProfileId: snapshot.childProfileId,
    characterId: snapshot.characterId,
    universeSeed: snapshot.universeSeed,
  })) {
    if (!value.trim())
      throw new Error(`Migration snapshot ${field} is required`);
  }
  if (
    snapshot.currentGenesis &&
    (snapshot.currentGenesis.householdId !== snapshot.householdId ||
      snapshot.currentGenesis.childProfileId !== snapshot.childProfileId ||
      snapshot.currentGenesis.characterId !== snapshot.characterId)
  ) {
    throw new Error("Migration snapshot current Genesis scope mismatch");
  }
}

function assertPlanMatchesSnapshot(
  snapshot: ExistingCharacterMigrationSnapshot,
  plan: ExistingCharacterMigrationPlan,
) {
  if (plan.characterId !== snapshot.characterId) {
    throw new Error("Migration plan character mismatch");
  }
  const currentFingerprint = fingerprintMigrationSnapshot(snapshot);
  if (plan.snapshotFingerprint !== currentFingerprint) {
    throw new Error(
      "Migration source changed after planning; re-audit before applying",
    );
  }
}

function assignSection(
  sections: CharacterGenesisSections,
  section: CharacterGenesisSectionKey,
  value: unknown,
) {
  switch (section) {
    case "origin":
      sections.origin = structuredClone(
        value as NonNullable<CharacterGenesisSections["origin"]>,
      );
      return;
    case "traits":
      sections.traits = structuredClone(
        value as NonNullable<CharacterGenesisSections["traits"]>,
      );
      return;
    case "social":
      sections.social = structuredClone(
        value as NonNullable<CharacterGenesisSections["social"]>,
      );
      return;
    case "inventory":
      sections.inventory = structuredClone(
        value as NonNullable<CharacterGenesisSections["inventory"]>,
      );
      return;
    case "memoryAndThreads":
      sections.memoryAndThreads = structuredClone(
        value as NonNullable<CharacterGenesisSections["memoryAndThreads"]>,
      );
      return;
    case "environment":
      sections.environment = structuredClone(
        value as NonNullable<CharacterGenesisSections["environment"]>,
      );
      return;
  }
}

function stableHash(value: unknown): string {
  const text = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => [key, sortJson(entry)]),
  );
}
