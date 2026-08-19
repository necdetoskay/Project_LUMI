export const GENESIS_RELATIONSHIP_DIMENSIONS = [
  "trust",
  "affection",
  "familiarity",
  "respect",
  "tension",
  "dependence",
] as const;

export type GenesisRelationshipDimension =
  (typeof GENESIS_RELATIONSHIP_DIMENSIONS)[number];
export type GenesisRelationshipDirection = "low" | "neutral" | "high";
export type GenesisRelationshipStrength = "weak" | "moderate" | "strong";
export type GenesisNpcSource = "origin" | "derived";

export interface GenesisNpcPersonalityProfile {
  traits: string[];
  interactionStyle: string;
  futureInteractionPotential: "low" | "medium" | "high";
}

export interface GenesisSocialNpcCandidate {
  identityKey: string;
  displayName: string;
  role: string;
  source: GenesisNpcSource;
  originFactIds: string[];
  aliases?: string[];
  personality: GenesisNpcPersonalityProfile;
}

export interface GenesisRelationshipSemanticEvidence {
  fromIdentityKey: string;
  toIdentityKey: string;
  dimension: GenesisRelationshipDimension;
  direction: GenesisRelationshipDirection;
  strength: GenesisRelationshipStrength;
  sourceFactIds: string[];
  rationale: string;
}

export interface GenesisNpcState {
  candidateId: string;
  identityKey: string;
  role: string;
  displayName: string;
  source: GenesisNpcSource;
  originFactIds: string[];
  aliases: string[];
  personality: GenesisNpcPersonalityProfile;
}

export interface GenesisRelationshipState {
  fromCandidateId: string;
  toCandidateId: string;
  trust: number;
  affection: number;
  familiarity: number;
  respect: number;
  tension: number;
  dependence: number;
  evidence: GenesisRelationshipSemanticEvidence[];
  derivationRevision: string;
}

export interface GenesisSocialState {
  npcs: GenesisNpcState[];
  relationships: GenesisRelationshipState[];
  derivationRevision: string;
}

export interface GenesisSocialValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

const DIRECTION_CENTER: Record<GenesisRelationshipDirection, number> = {
  low: 0.25,
  neutral: 0.5,
  high: 0.75,
};

const STRENGTH_WEIGHT: Record<GenesisRelationshipStrength, number> = {
  weak: 0.35,
  moderate: 0.6,
  strong: 0.85,
};

function canonicalIdentityKey(value: string): string {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, "-");
}

function seededUnit(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, Math.round(value * 10_000) / 10_000));
}

function deterministicCandidateId(identityKey: string, seed: string): string {
  const unit = Math.floor(seededUnit(`${seed}:${identityKey}`) * 0xffffffff)
    .toString(16)
    .padStart(8, "0");
  return `genesis-npc-${unit}`;
}

export function deduplicateGenesisNpcCandidates(
  candidates: GenesisSocialNpcCandidate[],
  seed: string,
): GenesisNpcState[] {
  const byIdentity = new Map<string, GenesisNpcState>();

  for (const candidate of candidates) {
    const identityKey = canonicalIdentityKey(candidate.identityKey);
    const existing = byIdentity.get(identityKey);
    if (!existing) {
      byIdentity.set(identityKey, {
        candidateId: deterministicCandidateId(identityKey, seed),
        identityKey,
        role: candidate.role,
        displayName: candidate.displayName,
        source: candidate.source,
        originFactIds: [...new Set(candidate.originFactIds)],
        aliases: [...new Set(candidate.aliases ?? [])],
        personality: structuredClone(candidate.personality),
      });
      continue;
    }

    existing.originFactIds = [
      ...new Set([...existing.originFactIds, ...candidate.originFactIds]),
    ];
    existing.aliases = [
      ...new Set([
        ...existing.aliases,
        ...(candidate.aliases ?? []),
        candidate.displayName,
      ]),
    ].filter((alias) => alias !== existing.displayName);
    if (existing.source === "derived" && candidate.source === "origin") {
      existing.source = "origin";
      existing.role = candidate.role;
      existing.displayName = candidate.displayName;
    }
  }

  return [...byIdentity.values()];
}

export function deriveDirectionalRelationships(input: {
  characterId: string;
  characterIdentityKey: string;
  npcs: GenesisNpcState[];
  evidence: GenesisRelationshipSemanticEvidence[];
  seed: string;
}): GenesisRelationshipState[] {
  const idByIdentity = new Map<string, string>([
    [canonicalIdentityKey(input.characterIdentityKey), input.characterId],
    ...input.npcs.map((npc) => [npc.identityKey, npc.candidateId] as const),
  ]);
  const grouped = new Map<string, GenesisRelationshipSemanticEvidence[]>();

  for (const evidence of input.evidence) {
    const fromKey = canonicalIdentityKey(evidence.fromIdentityKey);
    const toKey = canonicalIdentityKey(evidence.toIdentityKey);
    const fromCandidateId = idByIdentity.get(fromKey);
    const toCandidateId = idByIdentity.get(toKey);
    if (!fromCandidateId || !toCandidateId || fromCandidateId === toCandidateId) {
      continue;
    }
    const edgeKey = `${fromCandidateId}->${toCandidateId}`;
    const list = grouped.get(edgeKey) ?? [];
    list.push({ ...evidence, fromIdentityKey: fromKey, toIdentityKey: toKey });
    grouped.set(edgeKey, list);
  }

  return [...grouped.entries()].map(([edgeKey, edgeEvidence]) => {
    const [fromCandidateId, toCandidateId] = edgeKey.split("->");
    const vector = Object.fromEntries(
      GENESIS_RELATIONSHIP_DIMENSIONS.map((dimension) => {
        const items = edgeEvidence.filter((item) => item.dimension === dimension);
        if (items.length === 0) return [dimension, 0.5];
        let weighted = 0;
        let totalWeight = 0;
        for (const item of items) {
          const weight = STRENGTH_WEIGHT[item.strength];
          weighted += DIRECTION_CENTER[item.direction] * weight;
          totalWeight += weight;
        }
        const base = totalWeight === 0 ? 0.5 : weighted / totalWeight;
        const jitter =
          (seededUnit(`${input.seed}:${edgeKey}:${dimension}`) - 0.5) * 0.06;
        return [dimension, clamp(base + jitter)];
      }),
    ) as Record<GenesisRelationshipDimension, number>;

    return {
      fromCandidateId,
      toCandidateId,
      ...vector,
      evidence: structuredClone(edgeEvidence),
      derivationRevision: "character-social.v1",
    };
  });
}

export function createGenesisSocialState(input: {
  characterId: string;
  characterIdentityKey: string;
  candidates: GenesisSocialNpcCandidate[];
  evidence: GenesisRelationshipSemanticEvidence[];
  seed: string;
}): GenesisSocialState {
  const npcs = deduplicateGenesisNpcCandidates(input.candidates, input.seed);
  const relationships = deriveDirectionalRelationships({
    characterId: input.characterId,
    characterIdentityKey: input.characterIdentityKey,
    npcs,
    evidence: input.evidence,
    seed: input.seed,
  });
  return { npcs, relationships, derivationRevision: "character-social.v1" };
}

export function validateGenesisSocialState(input: {
  characterId: string;
  social: GenesisSocialState;
  originFactIds: Iterable<string>;
}): GenesisSocialValidationIssue[] {
  const issues: GenesisSocialValidationIssue[] = [];
  const npcIds = new Set(input.social.npcs.map((npc) => npc.candidateId));
  const knownIds = new Set([input.characterId, ...npcIds]);
  const originFactIds = new Set(input.originFactIds);

  if (npcIds.size !== input.social.npcs.length) {
    issues.push({
      code: "GENESIS_SOCIAL_DUPLICATE_NPC",
      message: "Social Genesis NPC ids must be unique after deduplication",
      severity: "error",
    });
  }

  for (const npc of input.social.npcs) {
    for (const factId of npc.originFactIds) {
      if (!originFactIds.has(factId)) {
        issues.push({
          code: "GENESIS_SOCIAL_NPC_FACT_MISSING",
          message: `${npc.displayName} references unknown origin fact ${factId}`,
          severity: "error",
        });
      }
    }
  }

  for (const edge of input.social.relationships) {
    if (!knownIds.has(edge.fromCandidateId) || !knownIds.has(edge.toCandidateId)) {
      issues.push({
        code: "GENESIS_SOCIAL_RELATIONSHIP_ENDPOINT_MISSING",
        message: `${edge.fromCandidateId}->${edge.toCandidateId} references a missing identity`,
        severity: "error",
      });
    }
    for (const dimension of GENESIS_RELATIONSHIP_DIMENSIONS) {
      const value = edge[dimension];
      if (value < 0 || value > 1) {
        issues.push({
          code: "GENESIS_SOCIAL_RELATIONSHIP_RANGE",
          message: `${dimension} must be within [0,1]`,
          severity: "error",
        });
      }
    }
    for (const evidence of edge.evidence) {
      for (const factId of evidence.sourceFactIds) {
        if (!originFactIds.has(factId)) {
          issues.push({
            code: "GENESIS_SOCIAL_EVIDENCE_FACT_MISSING",
            message: `${edge.fromCandidateId}->${edge.toCandidateId} references unknown origin fact ${factId}`,
            severity: "error",
          });
        }
      }
    }
  }

  if (input.social.npcs.length > 6) {
    issues.push({
      code: "GENESIS_SOCIAL_DENSITY_HIGH",
      message: "Initial Social Genesis should normally stay at six significant NPCs or fewer",
      severity: "warning",
    });
  }

  return issues;
}
