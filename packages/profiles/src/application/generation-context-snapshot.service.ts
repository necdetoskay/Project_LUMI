import { createHash } from "node:crypto";

import {
  fingerprintGenerationContext,
  type AssembledGenerationContext,
  type AssembledGenerationContextSection,
  type GenerationContextSectionProvenance,
} from "./generation-context-assembler";
import type { GenerationContextSourceReplayReference } from "./generation-context-source";

export const GENERATION_CONTEXT_SNAPSHOT_STORE = "profiles.context-snapshots";
export const GENERATION_CONTEXT_SNAPSHOT_VERSION = "v1";

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
  get(reference: GenerationContextSourceReplayReference): Promise<
    GenerationContextSnapshotEnvelope | null
  >;
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
  const { replay: _replay, ...rest } = provenance;
  return rest;
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

export interface ReplayedGenerationContext {
  assembled: AssembledGenerationContext;
  fingerprintMatches: boolean;
}

export async function replayGenerationContextFromSnapshots(
  evidence: AssembledGenerationContext,
  store: GenerationContextSnapshotStore,
): Promise<ReplayedGenerationContext> {
  const sections: AssembledGenerationContextSection[] = [];

  for (const section of evidence.sections) {
    const reference = section.provenance.replay;
    if (!reference) {
      throw new Error(`GENERATION_CONTEXT_REPLAY_REFERENCE_MISSING:${section.section}`);
    }
    const envelope = await store.get(reference);
    if (!envelope) {
      throw new Error(
        `GENERATION_CONTEXT_SNAPSHOT_MISSING:${section.section}:${reference.snapshotDigest}`,
      );
    }
    const digest = digestGenerationContextSnapshot(envelope);
    if (digest !== reference.snapshotDigest) {
      throw new Error(
        `GENERATION_CONTEXT_SNAPSHOT_DIGEST_MISMATCH:${section.section}`,
      );
    }
    if (envelope.section !== section.section) {
      throw new Error(
        `GENERATION_CONTEXT_SNAPSHOT_SECTION_MISMATCH:${section.section}:${envelope.section}`,
      );
    }

    sections.push({
      section: envelope.section,
      priority: envelope.priority,
      maxTokens: envelope.maxTokens,
      estimatedTokens: envelope.estimatedTokens,
      value: envelope.value,
      provenance: {
        ...envelope.provenance,
        replay: reference,
      },
    });
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
