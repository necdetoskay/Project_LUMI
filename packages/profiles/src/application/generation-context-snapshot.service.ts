import { createHash } from "node:crypto";

import {
  fingerprintGenerationContext,
  type AssembledGenerationContext,
  type AssembledGenerationContextSection,
  type GenerationContextSectionProvenance,
} from "./generation-context-assembler";
import type {
  GenerationContextPriority,
  GenerationContextSection,
} from "./generation-context-policy";
import type { GenerationContextSourceReplayReference } from "./generation-context-source";
import type { GenerationContextProfile } from "./generation-context.service";

export const GENERATION_CONTEXT_SNAPSHOT_STORE = "profiles.context-snapshots";
export const GENERATION_CONTEXT_SNAPSHOT_VERSION = "v1";

const CONTEXT_PROFILES: readonly GenerationContextProfile[] = [
  "character_onboarding",
  "story_generation",
  "world_generation",
];
const CONTEXT_PRIORITIES: readonly GenerationContextPriority[] = [
  "required",
  "high",
  "medium",
  "low",
];
const CONTEXT_SECTIONS: readonly GenerationContextSection[] = [
  "child_identity",
  "child_personalization",
  "creation_direction",
  "creation_selections",
  "character_state",
  "world_state",
  "recent_story_state",
  "relevant_memories",
];
const SHA256_HEX = /^[0-9a-f]{64}$/;

export interface GenerationContextSnapshotEnvelope {
  section: AssembledGenerationContextSection["section"];
  priority: AssembledGenerationContextSection["priority"];
  maxTokens: number;
  estimatedTokens: number;
  value: unknown;
  provenance: Omit<GenerationContextSectionProvenance, "replay">;
}

export interface GenerationContextSnapshotStore {
  put(input: {
    digest: string;
    store: string;
    snapshotVersion: string;
    payload: GenerationContextSnapshotEnvelope;
  }): Promise<void>;
  get(
    reference: GenerationContextSourceReplayReference,
  ): Promise<GenerationContextSnapshotEnvelope | null>;
}

export interface PersistedGenerationContextEvidence {
  contextFingerprint: string;
  contextProvenance: Record<string, unknown>;
}

export interface ReplayedGenerationContext {
  assembled: AssembledGenerationContext;
  fingerprintMatches: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isContextProfile(value: string): value is GenerationContextProfile {
  return CONTEXT_PROFILES.includes(value as GenerationContextProfile);
}

function isContextPriority(value: string): value is GenerationContextPriority {
  return CONTEXT_PRIORITIES.includes(value as GenerationContextPriority);
}

function isContextSection(value: string): value is GenerationContextSection {
  return CONTEXT_SECTIONS.includes(value as GenerationContextSection);
}

function parseReplayReference(
  value: unknown,
): GenerationContextSourceReplayReference | null {
  const reference = asRecord(value);
  const kind = asString(reference?.kind);
  const store = asString(reference?.store);
  const snapshotDigest = asString(reference?.snapshotDigest);
  const snapshotVersion = asString(reference?.snapshotVersion);

  if (
    kind !== "content_addressed_snapshot" ||
    !store?.trim() ||
    !snapshotVersion?.trim() ||
    !snapshotDigest ||
    !SHA256_HEX.test(snapshotDigest)
  ) {
    return null;
  }

  return {
    kind,
    store,
    snapshotDigest,
    snapshotVersion,
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

export function digestGenerationContextSnapshot(
  payload: GenerationContextSnapshotEnvelope,
): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(payload)))
    .digest("hex");
}

function withoutReplay(
  provenance: GenerationContextSectionProvenance,
): Omit<GenerationContextSectionProvenance, "replay"> {
  const copy = { ...provenance };
  delete copy.replay;
  return copy;
}

async function loadSnapshotSection(
  section: GenerationContextSection,
  reference: GenerationContextSourceReplayReference,
  store: GenerationContextSnapshotStore,
): Promise<AssembledGenerationContextSection> {
  const envelope = await store.get(reference);
  if (!envelope) {
    throw new Error(
      `GENERATION_CONTEXT_SNAPSHOT_MISSING:${section}:${reference.snapshotDigest}`,
    );
  }

  const digest = digestGenerationContextSnapshot(envelope);
  if (digest !== reference.snapshotDigest) {
    throw new Error(`GENERATION_CONTEXT_SNAPSHOT_DIGEST_MISMATCH:${section}`);
  }
  if (envelope.section !== section) {
    throw new Error(
      `GENERATION_CONTEXT_SNAPSHOT_SECTION_MISMATCH:${section}:${envelope.section}`,
    );
  }

  return {
    section: envelope.section,
    priority: envelope.priority,
    maxTokens: envelope.maxTokens,
    estimatedTokens: envelope.estimatedTokens,
    value: envelope.value,
    provenance: {
      ...envelope.provenance,
      replay: reference,
    },
  };
}

export async function materializeGenerationContextSnapshots(
  assembled: AssembledGenerationContext,
  store: GenerationContextSnapshotStore,
): Promise<AssembledGenerationContext> {
  const sections: AssembledGenerationContextSection[] = [];

  for (const section of assembled.sections) {
    if (section.provenance.compaction) {
      sections.push(section);
      continue;
    }

    const envelope: GenerationContextSnapshotEnvelope = {
      section: section.section,
      priority: section.priority,
      maxTokens: section.maxTokens,
      estimatedTokens: section.estimatedTokens,
      value: section.value,
      provenance: withoutReplay(section.provenance),
    };
    const digest = digestGenerationContextSnapshot(envelope);
    const replay: GenerationContextSourceReplayReference = {
      kind: "content_addressed_snapshot",
      store: GENERATION_CONTEXT_SNAPSHOT_STORE,
      snapshotDigest: digest,
      snapshotVersion: GENERATION_CONTEXT_SNAPSHOT_VERSION,
    };

    await store.put({
      digest,
      store: replay.store,
      snapshotVersion: replay.snapshotVersion,
      payload: envelope,
    });

    sections.push({
      ...section,
      provenance: {
        ...section.provenance,
        replay,
      },
    });
  }

  return {
    ...assembled,
    sections,
    fingerprint: fingerprintGenerationContext({
      profile: assembled.profile,
      maxContextTokens: assembled.maxContextTokens,
      sections,
    }),
  };
}

export async function replayGenerationContextFromSnapshots(
  evidence: AssembledGenerationContext,
  store: GenerationContextSnapshotStore,
): Promise<ReplayedGenerationContext> {
  const sections: AssembledGenerationContextSection[] = [];

  for (const section of evidence.sections) {
    const reference = section.provenance.replay;
    if (!reference) {
      throw new Error(
        `GENERATION_CONTEXT_REPLAY_REFERENCE_MISSING:${section.section}`,
      );
    }
    sections.push(await loadSnapshotSection(section.section, reference, store));
  }

  const reconstructed: AssembledGenerationContext = {
    ...evidence,
    sections,
    fingerprint: fingerprintGenerationContext({
      profile: evidence.profile,
      maxContextTokens: evidence.maxContextTokens,
      sections,
    }),
  };

  return {
    assembled: reconstructed,
    fingerprintMatches: reconstructed.fingerprint === evidence.fingerprint,
  };
}

export async function replayGenerationContextTraceEvidence(
  evidence: PersistedGenerationContextEvidence,
  store: GenerationContextSnapshotStore,
): Promise<ReplayedGenerationContext> {
  if (!SHA256_HEX.test(evidence.contextFingerprint)) {
    throw new Error("GENERATION_CONTEXT_TRACE_FINGERPRINT_INVALID");
  }

  const provenance = evidence.contextProvenance;
  const profile = asString(provenance.profile);
  const maxContextTokens = asNumber(provenance.maxContextTokens);
  const estimatedTokens = asNumber(provenance.estimatedTokens);
  const persistedSections = Array.isArray(provenance.sections)
    ? provenance.sections
    : null;

  if (
    !profile ||
    !isContextProfile(profile) ||
    maxContextTokens === null ||
    estimatedTokens === null ||
    !persistedSections
  ) {
    throw new Error("GENERATION_CONTEXT_TRACE_EVIDENCE_INVALID");
  }

  const droppedSections = Array.isArray(provenance.droppedSections)
    ? provenance.droppedSections.filter(
        (section): section is GenerationContextSection =>
          typeof section === "string" && isContextSection(section),
      )
    : [];
  const sections: AssembledGenerationContextSection[] = [];

  for (const persistedSection of persistedSections) {
    const sectionRecord = asRecord(persistedSection);
    const sectionName = asString(sectionRecord?.section);
    const priority = asString(sectionRecord?.priority);
    const sectionMaxTokens = asNumber(sectionRecord?.maxTokens);
    const sectionEstimatedTokens = asNumber(sectionRecord?.estimatedTokens);
    const persistedProvenance = asRecord(sectionRecord?.provenance);
    const reference = parseReplayReference(persistedProvenance?.replay);

    if (
      !sectionName ||
      !isContextSection(sectionName) ||
      !priority ||
      !isContextPriority(priority) ||
      sectionMaxTokens === null ||
      sectionEstimatedTokens === null ||
      !reference
    ) {
      throw new Error("GENERATION_CONTEXT_TRACE_SECTION_EVIDENCE_INVALID");
    }

    const reconstructedSection = await loadSnapshotSection(
      sectionName,
      reference,
      store,
    );
    if (
      reconstructedSection.priority !== priority ||
      reconstructedSection.maxTokens !== sectionMaxTokens ||
      reconstructedSection.estimatedTokens !== sectionEstimatedTokens
    ) {
      throw new Error(
        `GENERATION_CONTEXT_TRACE_SECTION_METADATA_MISMATCH:${sectionName}`,
      );
    }
    sections.push(reconstructedSection);
  }

  const fingerprint = fingerprintGenerationContext({
    profile,
    maxContextTokens,
    sections,
  });
  const assembled: AssembledGenerationContext = {
    profile,
    maxContextTokens,
    estimatedTokens,
    fingerprint,
    sections,
    droppedSections,
  };

  return {
    assembled,
    fingerprintMatches: fingerprint === evidence.contextFingerprint,
  };
}
