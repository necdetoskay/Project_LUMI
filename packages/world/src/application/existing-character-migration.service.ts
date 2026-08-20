import {
  createExistingCharacterRollbackManifest,
  createExistingCharacterMigrationPlan,
  buildExistingCharacterMigrationCandidate,
  fingerprintMigrationSnapshot,
  type ExistingCharacterBackfillProposal,
  type ExistingCharacterMigrationMode,
  type ExistingCharacterMigrationPlan,
  type ExistingCharacterMigrationSnapshot,
  type ExistingCharacterRollbackManifest,
  type ExistingCharacterMigrationMarker,
} from "../domain/existing-character-migration";
import {
  selectCharacterGenesisPackage,
  markCharacterGenesisCommitted,
  type CharacterGenesisPackage,
} from "../domain/character-genesis";
import {
  validateCharacterGenesisCrossDomain,
  type CharacterGenesisCrossDomainValidationContext,
} from "../domain/character-genesis-cross-domain";

export interface ExistingCharacterMigrationSourcePort {
  read(characterId: string): Promise<ExistingCharacterMigrationSnapshot>;
}

export interface ExistingCharacterMigrationRecord {
  plan: ExistingCharacterMigrationPlan;
  status: "planned" | "applied" | "rolled_back" | "blocked";
  rollbackManifest?: ExistingCharacterRollbackManifest;
  marker?: ExistingCharacterMigrationMarker;
  appliedGenesisId?: string;
  updatedAt: string;
}

export interface ExistingCharacterMigrationRepositoryPort {
  getByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<ExistingCharacterMigrationRecord | null>;
  save(record: ExistingCharacterMigrationRecord): Promise<void>;
}

export interface ExistingCharacterMigrationUpgradeRequest {
  candidate: CharacterGenesisPackage;
  idempotencyKey: string;
  rollbackManifest: ExistingCharacterRollbackManifest;
}

export interface ExistingCharacterMigrationUpgradeResult {
  genesisId: string;
  marker: ExistingCharacterMigrationMarker;
}

/**
 * Production adapters must apply only Genesis additions represented by the migration
 * candidate. Historical story/world/NPC/inventory authorities must never be rewritten.
 */
export interface ExistingCharacterMigrationUpgradePort {
  apply(
    request: ExistingCharacterMigrationUpgradeRequest,
  ): Promise<ExistingCharacterMigrationUpgradeResult>;
  rollback(input: {
    characterId: string;
    migrationId: string;
    idempotencyKey: string;
    manifest: ExistingCharacterRollbackManifest;
  }): Promise<void>;
}

export interface ExistingCharacterMigrationValidationContextPort {
  resolve(
    candidate: CharacterGenesisPackage,
  ):
    | CharacterGenesisCrossDomainValidationContext
    | Promise<CharacterGenesisCrossDomainValidationContext>;
}

export interface ExistingCharacterMigrationInspection {
  snapshot: ExistingCharacterMigrationSnapshot;
  plan: ExistingCharacterMigrationPlan;
  candidate: CharacterGenesisPackage | null;
  validation: ReturnType<typeof validateCharacterGenesisCrossDomain> | null;
}

export class ExistingCharacterMigrationCoordinator {
  constructor(
    private readonly source: ExistingCharacterMigrationSourcePort,
    private readonly records: ExistingCharacterMigrationRepositoryPort,
    private readonly upgradePort: ExistingCharacterMigrationUpgradePort,
    private readonly validationContext?: ExistingCharacterMigrationValidationContextPort,
  ) {}

  async inspect(input: {
    characterId: string;
    mode: ExistingCharacterMigrationMode;
    proposals: ExistingCharacterBackfillProposal[];
    now?: string;
  }): Promise<ExistingCharacterMigrationInspection> {
    const snapshot = await this.source.read(input.characterId);
    const plan = createExistingCharacterMigrationPlan({
      snapshot,
      mode: input.mode,
      proposals: input.proposals,
      ...(input.now ? { now: input.now } : {}),
    });
    if (!plan.sandboxApplyAllowed) {
      return { snapshot, plan, candidate: null, validation: null };
    }

    const candidate = buildExistingCharacterMigrationCandidate({
      snapshot,
      plan,
      ...(input.now ? { now: input.now } : {}),
    });
    const validationContext = this.validationContext
      ? await this.validationContext.resolve(structuredClone(candidate))
      : {};
    const validation = validateCharacterGenesisCrossDomain(candidate, {
      ...validationContext,
      requireCompletePackage: true,
    });
    return { snapshot, plan, candidate, validation };
  }

  async explicitUpgrade(input: {
    characterId: string;
    proposals: ExistingCharacterBackfillProposal[];
    now?: string;
  }): Promise<ExistingCharacterMigrationRecord> {
    const inspected = await this.inspect({
      characterId: input.characterId,
      mode: "explicit_upgrade",
      proposals: input.proposals,
      ...(input.now ? { now: input.now } : {}),
    });
    const { snapshot, plan, candidate, validation } = inspected;

    const existing = await this.records.getByIdempotencyKey(
      plan.idempotencyKey,
    );
    if (existing?.status === "applied") return structuredClone(existing);

    if (!plan.explicitUpgradeAllowed) {
      const blocked = migrationRecord(plan, "blocked", input.now);
      await this.records.save(blocked);
      throw new ExistingCharacterMigrationBlockedError(plan);
    }
    if (!candidate || !validation?.valid) {
      const blocked = migrationRecord(plan, "blocked", input.now);
      await this.records.save(blocked);
      throw new ExistingCharacterMigrationValidationError(plan, validation);
    }

    // Re-read immediately before mutation. A story/world/inventory update that happened
    // after planning invalidates the proposal and forces a fresh audit.
    const latest = await this.source.read(input.characterId);
    if (fingerprintMigrationSnapshot(latest) !== plan.snapshotFingerprint) {
      throw new Error(
        "Migration source changed after planning; re-audit before upgrade",
      );
    }

    const selected = selectCharacterGenesisPackage(candidate, input.now);
    const selectedValidationContext = this.validationContext
      ? await this.validationContext.resolve(structuredClone(selected))
      : {};
    const selectedValidation = validateCharacterGenesisCrossDomain(selected, {
      ...selectedValidationContext,
      requireCompletePackage: true,
      requireSelectedForCommit: true,
    });
    if (!selectedValidation.valid) {
      throw new ExistingCharacterMigrationValidationError(
        plan,
        selectedValidation,
      );
    }

    const rollbackManifest = createExistingCharacterRollbackManifest({
      snapshot,
      plan,
      ...(input.now ? { now: input.now } : {}),
    });
    // Persist recovery evidence before the canonical adapter is allowed to mutate.
    await this.records.save({
      ...migrationRecord(plan, "planned", input.now),
      rollbackManifest,
    });

    const result = await this.upgradePort.apply({
      candidate: structuredClone(selected),
      idempotencyKey: plan.idempotencyKey,
      rollbackManifest: structuredClone(rollbackManifest),
    });
    const committed = markCharacterGenesisCommitted(selected, input.now);
    const applied: ExistingCharacterMigrationRecord = {
      plan,
      status: "applied",
      rollbackManifest,
      marker: {
        ...result.marker,
        schemaRevision: plan.targetSchemaRevision,
        migrationRevision: plan.migrationRevision,
        migrationId: plan.id,
        upgradedAt: input.now ?? new Date().toISOString(),
      },
      appliedGenesisId: result.genesisId || committed.id,
      updatedAt: input.now ?? new Date().toISOString(),
    };
    await this.records.save(applied);
    return structuredClone(applied);
  }

  async rollback(characterId: string, idempotencyKey: string): Promise<void> {
    const record = await this.records.getByIdempotencyKey(idempotencyKey);
    if (!record || record.plan.characterId !== characterId) {
      throw new Error("Existing-character migration record not found");
    }
    if (record.status === "rolled_back") return;
    if (record.status !== "applied" || !record.rollbackManifest) {
      throw new Error(
        "Only an applied migration with recovery evidence can roll back",
      );
    }

    await this.upgradePort.rollback({
      characterId,
      migrationId: record.plan.id,
      idempotencyKey: `${idempotencyKey}:rollback`,
      manifest: structuredClone(record.rollbackManifest),
    });
    const beforeMarker = record.rollbackManifest.beforeMarker;
    await this.records.save({
      ...record,
      status: "rolled_back",
      ...(beforeMarker ? { marker: beforeMarker } : {}),
      updatedAt: new Date().toISOString(),
    });
  }
}

function migrationRecord(
  plan: ExistingCharacterMigrationPlan,
  status: ExistingCharacterMigrationRecord["status"],
  now?: string,
): ExistingCharacterMigrationRecord {
  return {
    plan: structuredClone(plan),
    status,
    updatedAt: now ?? new Date().toISOString(),
  };
}

export class ExistingCharacterMigrationBlockedError extends Error {
  constructor(public readonly plan: ExistingCharacterMigrationPlan) {
    super("Existing-character migration is blocked by policy or conflicts");
    this.name = "ExistingCharacterMigrationBlockedError";
  }
}

export class ExistingCharacterMigrationValidationError extends Error {
  constructor(
    public readonly plan: ExistingCharacterMigrationPlan,
    public readonly validation: ReturnType<
      typeof validateCharacterGenesisCrossDomain
    > | null,
  ) {
    super("Existing-character migration candidate failed Genesis validation");
    this.name = "ExistingCharacterMigrationValidationError";
  }
}
