import {
  validateCharacterFoundation,
  type BootstrapMaterializationRef,
  type CharacterFoundationRecord,
  type FoundationProvenance,
  type GenesisArchetype,
  type LivingWorldBootstrapManifest,
  type SocialEcologyRole,
  type SocialEcologyRoleType,
} from "../domain/character-genesis";

export const LIVING_WORLD_BOOTSTRAP_VERSION = 1;

export interface SocialEcologyMaterializationPlan {
  role: SocialEcologyRole;
  identityHint: string;
  relationshipSeed: number;
  needTypes: string[];
  support: string[];
}

export interface LivingWorldBootstrapPlan {
  version: number;
  roles: SocialEcologyMaterializationPlan[];
  localSupport: string[];
  provenance: FoundationProvenance;
}

export interface LivingWorldBootstrapNpcResult {
  npcId: string;
  npcReused: boolean;
  relationshipEntityId: string;
  relationshipReused: boolean;
}

export interface LivingWorldBootstrapMaterializer {
  ensureNpc(input: {
    foundation: CharacterFoundationRecord;
    plan: SocialEcologyMaterializationPlan;
    idempotencyKey: string;
  }): Promise<LivingWorldBootstrapNpcResult>;
  resolveLocalContext(input: {
    foundation: CharacterFoundationRecord;
    idempotencyKey: string;
  }): Promise<BootstrapMaterializationRef[]>;
}

export interface LivingWorldBootstrapManifestStore {
  save(
    foundation: CharacterFoundationRecord,
    manifest: LivingWorldBootstrapManifest,
  ): Promise<void>;
}

export interface LivingWorldBootstrapResult {
  status: "completed";
  plan: LivingWorldBootstrapPlan;
  manifest: LivingWorldBootstrapManifest;
}

const ARCHETYPE_ROLE_SETS: Readonly<
  Record<GenesisArchetype, readonly SocialEcologyRoleType[]>
> = {
  rooted: ["community_member", "friend", "mentor"],
  lost: ["rescuer", "first_neutral_contact", "unknown_presence"],
  awakened: ["first_neutral_contact", "mentor", "unknown_presence"],
  hatched: ["local_guardian", "first_neutral_contact", "symbiotic_creature"],
  exiled: ["first_neutral_contact", "rival", "community_member"],
  arrived: ["first_neutral_contact", "neighbour", "community_member"],
  adopted: ["caregiver", "friend", "community_member"],
  hidden: ["local_guardian", "unknown_presence"],
  last_known: [
    "distant_kin_signal",
    "first_neutral_contact",
    "unknown_presence",
  ],
  created: ["creator", "facility_ai", "maintenance_companion"],
  escaped: ["rescuer", "first_neutral_contact", "unknown_presence"],
  chosen_by_accident: ["mentor", "friend", "unknown_presence"],
};

const ROLE_RELATIONSHIP_SEEDS: Readonly<
  Partial<Record<SocialEcologyRoleType, number>>
> = {
  caregiver: 0.7,
  friend: 0.55,
  mentor: 0.45,
  rescuer: 0.45,
  local_guardian: 0.35,
  creator: 0.15,
  facility_ai: 0.2,
  maintenance_companion: 0.4,
  symbiotic_creature: 0.5,
  neighbour: 0.2,
  community_member: 0.15,
  first_neutral_contact: 0.05,
  distant_kin_signal: 0.1,
  rival: -0.15,
  predator: -0.35,
  unknown_presence: 0,
  sibling: 0.45,
  family: 0.5,
  custom: 0,
};

function bootstrapProvenance(
  foundation: CharacterFoundationRecord,
): FoundationProvenance {
  const manifest = foundation.bootstrapManifest;
  return {
    generationIntent: "living_world_bootstrap",
    promptKey: "character_genesis.social_ecology.derived_v1",
    promptVersion: LIVING_WORLD_BOOTSTRAP_VERSION,
    model: "deterministic-foundation-derivation",
    provider: "lumi",
    ...(manifest?.idempotencyKey
      ? { requestId: manifest.idempotencyKey, rngSeed: manifest.idempotencyKey }
      : {}),
    generatedAt: manifest?.createdAt ?? foundation.createdAt,
  };
}

function roleLabel(roleType: SocialEcologyRoleType): string {
  return roleType.replaceAll("_", " ");
}

function supportForRole(
  foundation: CharacterFoundationRecord,
  roleType: SocialEcologyRoleType,
): string[] {
  const support = [
    foundation.genesis.currentSituation,
    foundation.genesis.fundamentalNeed,
  ].filter((value) => value.trim().length > 0);
  if (roleType === "unknown_presence" || roleType === "distant_kin_signal") {
    support.push(...foundation.genesis.unknownQuestions.slice(0, 1));
  }
  if (roleType === "rival" || roleType === "predator") {
    support.push(foundation.sagaCanon.stakes);
  }
  return [...new Set(support)].slice(0, 3);
}

function purposeForRole(
  foundation: CharacterFoundationRecord,
  roleType: SocialEcologyRoleType,
): string {
  const support = supportForRole(foundation, roleType);
  return `${roleLabel(roleType)} exists because the opening situation needs: ${support.join(" | ")}`.slice(
    0,
    800,
  );
}

function identityHintForRole(
  foundation: CharacterFoundationRecord,
  roleType: SocialEcologyRoleType,
): string {
  const premise = foundation.genesis.premise.replace(/\s+/g, " ").trim();
  return `${roleLabel(roleType)} connected to ${premise}`.slice(0, 120);
}

function needTypesForRole(roleType: SocialEcologyRoleType): string[] {
  switch (roleType) {
    case "caregiver":
      return ["love", "safety"];
    case "rescuer":
    case "local_guardian":
      return ["safety", "purpose"];
    case "friend":
    case "neighbour":
    case "community_member":
    case "symbiotic_creature":
    case "sibling":
    case "family":
      return ["belonging"];
    case "mentor":
    case "facility_ai":
    case "maintenance_companion":
      return ["learning", "purpose"];
    case "creator":
      return ["purpose", "achievement"];
    case "rival":
      return ["achievement"];
    case "predator":
      return ["hunger", "safety"];
    case "unknown_presence":
    case "distant_kin_signal":
    case "first_neutral_contact":
      return ["curiosity"];
    default:
      return ["purpose"];
  }
}

function semanticRoleTypes(
  foundation: CharacterFoundationRecord,
): SocialEcologyRoleType[] {
  const text = [
    foundation.genesis.premise,
    foundation.genesis.currentSituation,
    ...foundation.genesis.knownFacts,
    ...foundation.genesis.unknownQuestions,
  ]
    .join(" ")
    .toLocaleLowerCase("tr-TR");
  const roles: SocialEcologyRoleType[] = [];
  if (/robot|makine|machine|android|tesis|facility|sistem/.test(text)) {
    roles.push("facility_ai");
  }
  if (/hafıza|hatırla|memoryless|memory loss/.test(text)) {
    roles.push("rescuer");
  }
  if (/mercan|resif|reef|okyanus|deniz|sürü|koloni|shoal/.test(text)) {
    roles.push("community_member", "symbiotic_creature");
  }
  return roles;
}

function deriveRoleTypes(
  foundation: CharacterFoundationRecord,
): SocialEcologyRoleType[] {
  const explicit = foundation.genesis.socialEcology;
  if (explicit.length > 0) {
    return [...new Set(explicit.map((role) => role.roleType))];
  }
  const archetypeRoles = foundation.genesis.archetypes.flatMap(
    (archetype) => ARCHETYPE_ROLE_SETS[archetype],
  );
  return [
    ...new Set([...archetypeRoles, ...semanticRoleTypes(foundation)]),
  ].slice(0, 7);
}

export function planLivingWorldBootstrap(
  foundation: CharacterFoundationRecord,
): LivingWorldBootstrapPlan {
  validateCharacterFoundation(foundation);
  const explicit = foundation.genesis.socialEcology.map((role) => ({
    ...role,
  }));
  const explicitByType = new Map(explicit.map((role) => [role.roleType, role]));
  const roleTypes = deriveRoleTypes(foundation);
  const roles = roleTypes.map((roleType, index) => {
    const existing = explicitByType.get(roleType);
    const support = supportForRole(foundation, roleType);
    const role: SocialEcologyRole = existing ?? {
      id: `bootstrap-role-${index + 1}-${roleType}`,
      roleType,
      label: roleLabel(roleType),
      purpose: purposeForRole(foundation, roleType),
      required: index === 0,
      materializationHint: identityHintForRole(foundation, roleType),
    };
    return {
      role,
      identityHint:
        role.materializationHint ?? identityHintForRole(foundation, roleType),
      relationshipSeed: ROLE_RELATIONSHIP_SEEDS[roleType] ?? 0,
      needTypes: needTypesForRole(roleType),
      support,
    } satisfies SocialEcologyMaterializationPlan;
  });
  return {
    version: LIVING_WORLD_BOOTSTRAP_VERSION,
    roles,
    localSupport: [
      ...foundation.genesis.knownFacts,
      foundation.genesis.currentSituation,
    ].filter((value, index, all) => value && all.indexOf(value) === index),
    provenance: bootstrapProvenance(foundation),
  };
}

function appendRef(
  manifest: LivingWorldBootstrapManifest,
  ref: BootstrapMaterializationRef,
): LivingWorldBootstrapManifest {
  if (
    manifest.materialized.some(
      (existing) =>
        existing.kind === ref.kind &&
        existing.authority === ref.authority &&
        existing.entityId === ref.entityId,
    )
  ) {
    return manifest;
  }
  return { ...manifest, materialized: [...manifest.materialized, ref] };
}

function clearFailureCode(
  manifest: LivingWorldBootstrapManifest,
): Omit<LivingWorldBootstrapManifest, "failureCode"> {
  const { failureCode: _failureCode, ...rest } = manifest;
  return rest;
}

export class LivingWorldBootstrapService {
  constructor(
    private readonly materializer: LivingWorldBootstrapMaterializer,
    private readonly store: LivingWorldBootstrapManifestStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async run(
    foundation: CharacterFoundationRecord,
  ): Promise<LivingWorldBootstrapResult> {
    validateCharacterFoundation(foundation);
    const original = foundation.bootstrapManifest;
    if (!original) throw new Error("LIVING_WORLD_BOOTSTRAP_MANIFEST_REQUIRED");
    const plan = planLivingWorldBootstrap(foundation);
    if (original.status === "completed") {
      return { status: "completed", plan, manifest: original };
    }
    let manifest: LivingWorldBootstrapManifest = {
      ...clearFailureCode(original),
      provenance: plan.provenance,
      status: "running",
      updatedAt: this.now(),
    };
    await this.store.save(foundation, manifest);
    try {
      const localRefs = await this.materializer.resolveLocalContext({
        foundation,
        idempotencyKey: manifest.idempotencyKey,
      });
      for (const ref of localRefs) manifest = appendRef(manifest, ref);
      await this.store.save(foundation, { ...manifest, updatedAt: this.now() });

      for (const rolePlan of plan.roles) {
        const existingNpc = manifest.materialized.find(
          (ref) => ref.kind === "npc" && ref.genesisRoleId === rolePlan.role.id,
        );
        const existingRelationship = manifest.materialized.find(
          (ref) =>
            ref.kind === "relationship" &&
            ref.genesisRoleId === rolePlan.role.id,
        );
        if (existingNpc && existingRelationship) continue;
        const materialized = await this.materializer.ensureNpc({
          foundation,
          plan: rolePlan,
          idempotencyKey: manifest.idempotencyKey,
        });
        manifest = appendRef(manifest, {
          kind: "npc",
          authority: "profile.lumi_characters",
          entityId: materialized.npcId,
          genesisRoleId: rolePlan.role.id,
          reused: materialized.npcReused,
        });
        manifest = appendRef(manifest, {
          kind: "relationship",
          authority: "profile.character_relationships",
          entityId: materialized.relationshipEntityId,
          genesisRoleId: rolePlan.role.id,
          reused: materialized.relationshipReused,
        });
        await this.store.save(foundation, {
          ...manifest,
          updatedAt: this.now(),
        });
      }

      manifest = {
        ...clearFailureCode(manifest),
        provenance: plan.provenance,
        status: "completed",
        updatedAt: this.now(),
      };
      await this.store.save(foundation, manifest);
      return { status: "completed", plan, manifest };
    } catch (error) {
      const failureCode =
        error instanceof Error && error.message
          ? error.message.slice(0, 120)
          : "LIVING_WORLD_BOOTSTRAP_FAILED";
      manifest = {
        ...manifest,
        provenance: plan.provenance,
        status: "failed",
        failureCode,
        updatedAt: this.now(),
      };
      await this.store.save(foundation, manifest);
      throw error;
    }
  }
}
