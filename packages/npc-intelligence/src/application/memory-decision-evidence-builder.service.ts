import type {
  CandidateAction,
  CanonicalMemory,
  DecisionMemoryEvidence,
} from "../domain";
import { effectiveMemorySalience } from "../domain/memory-lifecycle";

const DECISION_TAG_PREFIX = "decision";
const TAG_TARGETS = new Set(["candidate", "kind"]);

interface ParsedDecisionTag {
  target: "candidate" | "kind";
  value: string;
  affinity: number;
}

function parseDecisionTag(entry: string): ParsedDecisionTag | null {
  const [prefix, target, value, affinityText, ...rest] = entry.split(":");
  if (
    prefix !== DECISION_TAG_PREFIX ||
    !TAG_TARGETS.has(target ?? "") ||
    !value ||
    !affinityText ||
    rest.length > 0
  ) {
    return null;
  }

  const affinity = Number(affinityText);
  if (!Number.isFinite(affinity) || affinity < -1 || affinity > 1) {
    return null;
  }

  return {
    target: target as "candidate" | "kind",
    value,
    affinity,
  };
}

/**
 * Converts canonical memories into bounded decision evidence using only
 * explicit structured provenance tags.
 *
 * Supported tags:
 * - decision:candidate:<candidate-id>:<affinity -1..1>
 * - decision:kind:<candidate-kind>:<affinity -1..1>
 *
 * Free-form memory summary text is deliberately ignored. This keeps NPC
 * autonomous behavior deterministic, auditable and independent of brittle
 * keyword/LLM interpretation.
 */
export class MemoryDecisionEvidenceBuilder {
  build(
    memories: readonly CanonicalMemory[],
    candidates: readonly CandidateAction[],
    now: Date,
  ): DecisionMemoryEvidence[] {
    const candidateById = new Map(
      candidates.map((candidate) => [candidate.id, candidate]),
    );

    return memories.flatMap((memory) => {
      const tags = memory.provenance
        .map(parseDecisionTag)
        .filter((tag): tag is ParsedDecisionTag => tag !== null);
      if (tags.length === 0) return [];

      const affinities = new Map<string, number[]>();
      for (const tag of tags) {
        for (const candidate of candidates) {
          const matches =
            (tag.target === "candidate" && candidate.id === tag.value) ||
            (tag.target === "kind" && candidate.kind === tag.value);
          if (!matches || !candidateById.has(candidate.id)) continue;
          const values = affinities.get(candidate.id) ?? [];
          values.push(tag.affinity);
          affinities.set(candidate.id, values);
        }
      }

      if (affinities.size === 0) return [];

      const candidateAffinity: Record<string, number> = {};
      for (const [candidateId, values] of [...affinities.entries()].sort(
        ([a], [b]) => a.localeCompare(b),
      )) {
        const average =
          values.reduce((sum, value) => sum + value, 0) / values.length;
        candidateAffinity[candidateId] = Number(average.toFixed(6));
      }

      return [
        {
          memoryId: memory.id,
          kind: memory.kind,
          effectiveSalience: Number(
            effectiveMemorySalience(memory, now).toFixed(6),
          ),
          confidence: memory.confidence,
          candidateAffinity,
        },
      ];
    });
  }
}
