import type {
  CandidateEvaluation,
  JudgeConsensus,
} from "./evaluation";
import type { JsonObject, JsonValue } from "./test-lab-types";

export type ConsistencySeverity = "warning" | "error";

export interface NarrativeStateConsistencyIssue {
  code:
    | "ITEM_RETAINED_AFTER_LOSS"
    | "ITEM_MISSING_AFTER_GAIN";
  severity: ConsistencySeverity;
  itemKey: string;
  message: string;
  evidence: string;
}

export interface NarrativeStateConsistencyReport {
  consistent: boolean;
  issues: NarrativeStateConsistencyIssue[];
}

export interface JudgeHumanAgreement {
  candidateCount: number;
  meanAbsoluteScoreDifference: number | null;
  rankingAgreement: number | null;
  perCandidate: Array<{
    candidateId: string;
    judgeMeanScore: number;
    humanMeanScore: number;
    absoluteDifference: number;
  }>;
}

export interface StoryArcEntry {
  storyId: string;
  narrative: string;
  resultingState: JsonObject;
}

export interface StoryArcEvaluationPayload extends JsonObject {
  storyCount: number;
  stories: JsonValue[];
  continuitySignals: JsonObject;
}

const LOSS_VERBS = [
  "lost",
  "gave away",
  "gave",
  "dropped",
  "discarded",
  "threw away",
  "used up",
  "kaybetti",
  "verdi",
  "bıraktı",
  "attı",
  "tüketti",
];

const GAIN_VERBS = [
  "found",
  "received",
  "got",
  "picked up",
  "earned",
  "buldu",
  "aldı",
  "kazandı",
  "eline aldı",
];

export function checkNarrativeStateConsistency(input: {
  narrative: string;
  beforeState: JsonObject;
  afterState: JsonObject;
}): NarrativeStateConsistencyReport {
  const before = inventoryIndex(input.beforeState);
  const after = inventoryIndex(input.afterState);
  const narrative = normalizeText(input.narrative);
  const issues: NarrativeStateConsistencyIssue[] = [];

  for (const [key, label] of before) {
    if (after.has(key) && mentionsAction(narrative, label, LOSS_VERBS)) {
      issues.push({
        code: "ITEM_RETAINED_AFTER_LOSS",
        severity: "error",
        itemKey: key,
        message: `${label} narrative içinde kaybedilmiş/elden çıkarılmış görünüyor ancak resulting state inventory içinde korunmuş.`,
        evidence: label,
      });
    }
  }

  for (const [key, label] of mentionedInventoryCandidates(input.afterState)) {
    if (!after.has(key) && mentionsAction(narrative, label, GAIN_VERBS)) {
      issues.push({
        code: "ITEM_MISSING_AFTER_GAIN",
        severity: "error",
        itemKey: key,
        message: `${label} narrative içinde kazanılmış/bulunmuş görünüyor ancak resulting state inventory içinde yok.`,
        evidence: label,
      });
    }
  }

  return { consistent: issues.length === 0, issues };
}

export function calculateJudgeHumanAgreement(input: {
  judgeConsensus: JudgeConsensus[];
  humanEvaluations: CandidateEvaluation[];
}): JudgeHumanAgreement {
  const humanByCandidate = new Map<string, number[]>();
  for (const evaluation of input.humanEvaluations) {
    if (evaluation.authorType !== "human") continue;
    const scores = humanByCandidate.get(evaluation.candidateId) ?? [];
    scores.push(evaluation.overallScore);
    humanByCandidate.set(evaluation.candidateId, scores);
  }

  const perCandidate = input.judgeConsensus.flatMap((judge) => {
    const humanScores = humanByCandidate.get(judge.candidateId);
    if (!humanScores?.length || judge.judgeCount === 0) return [];
    const humanMeanScore = mean(humanScores);
    return [
      {
        candidateId: judge.candidateId,
        judgeMeanScore: judge.meanScore,
        humanMeanScore,
        absoluteDifference: Math.abs(judge.meanScore - humanMeanScore),
      },
    ];
  });

  if (perCandidate.length === 0) {
    return {
      candidateCount: 0,
      meanAbsoluteScoreDifference: null,
      rankingAgreement: null,
      perCandidate: [],
    };
  }

  return {
    candidateCount: perCandidate.length,
    meanAbsoluteScoreDifference: mean(
      perCandidate.map((item) => item.absoluteDifference),
    ),
    rankingAgreement:
      perCandidate.length < 2 ? null : pairwiseRankingAgreement(perCandidate),
    perCandidate,
  };
}

export function createStoryArcEvaluationPayload(
  entries: StoryArcEntry[],
): StoryArcEvaluationPayload {
  const characterFingerprints = entries.map((entry) =>
    stableFingerprint(entry.resultingState.character ?? null),
  );
  const worldFingerprints = entries.map((entry) =>
    stableFingerprint(entry.resultingState.world ?? null),
  );
  const npcFingerprints = entries.map((entry) =>
    stableFingerprint(entry.resultingState.npcs ?? null),
  );

  return {
    storyCount: entries.length,
    stories: entries.map((entry, index) => ({
      ordinal: index + 1,
      storyId: entry.storyId,
      narrative: entry.narrative,
      resultingState: structuredClone(entry.resultingState),
    })),
    continuitySignals: {
      characterStateChanges: transitionCount(characterFingerprints),
      worldStateChanges: transitionCount(worldFingerprints),
      npcStateChanges: transitionCount(npcFingerprints),
      repeatedNarrativePairs: repeatedNarrativePairs(entries.map((entry) => entry.narrative)),
    },
  };
}

function inventoryIndex(state: JsonObject): Map<string, string> {
  const value = state.inventory;
  if (!Array.isArray(value)) return new Map();
  return new Map(
    value.flatMap((item) => {
      const label = inventoryLabel(item);
      return label ? [[normalizeKey(label), label] as const] : [];
    }),
  );
}

function mentionedInventoryCandidates(state: JsonObject): Map<string, string> {
  return inventoryIndex(state);
}

function inventoryLabel(value: JsonValue): string | null {
  if (typeof value === "string") return value;
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  for (const key of ["name", "label", "title", "key", "id"]) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return null;
}

function mentionsAction(
  narrative: string,
  itemLabel: string,
  verbs: string[],
): boolean {
  const label = normalizeText(itemLabel);
  if (!narrative.includes(label)) return false;
  return verbs.some((verb) => {
    const normalizedVerb = normalizeText(verb);
    const verbIndex = narrative.indexOf(normalizedVerb);
    const labelIndex = narrative.indexOf(label);
    return verbIndex >= 0 && Math.abs(verbIndex - labelIndex) <= 80;
  });
}

function normalizeText(value: string): string {
  return value.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
}

function normalizeKey(value: string): string {
  return normalizeText(value).replace(/[^\p{L}\p{N}]+/gu, "_");
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pairwiseRankingAgreement(
  values: Array<{
    judgeMeanScore: number;
    humanMeanScore: number;
  }>,
): number {
  let agreements = 0;
  let comparable = 0;
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      const judgeDelta =
        values[left]!.judgeMeanScore - values[right]!.judgeMeanScore;
      const humanDelta =
        values[left]!.humanMeanScore - values[right]!.humanMeanScore;
      if (judgeDelta === 0 || humanDelta === 0) continue;
      comparable += 1;
      if (Math.sign(judgeDelta) === Math.sign(humanDelta)) agreements += 1;
    }
  }
  return comparable === 0 ? 1 : agreements / comparable;
}

function stableFingerprint(value: JsonValue): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, sortJson(item)]),
  );
}

function transitionCount(fingerprints: string[]): number {
  let count = 0;
  for (let index = 1; index < fingerprints.length; index += 1) {
    if (fingerprints[index] !== fingerprints[index - 1]) count += 1;
  }
  return count;
}

function repeatedNarrativePairs(narratives: string[]): number {
  let repeated = 0;
  for (let left = 0; left < narratives.length; left += 1) {
    for (let right = left + 1; right < narratives.length; right += 1) {
      if (tokenJaccard(narratives[left]!, narratives[right]!) >= 0.72) {
        repeated += 1;
      }
    }
  }
  return repeated;
}

function tokenJaccard(left: string, right: string): number {
  const leftTokens = new Set(normalizeText(left).split(/\W+/u).filter(Boolean));
  const rightTokens = new Set(normalizeText(right).split(/\W+/u).filter(Boolean));
  const union = new Set([...leftTokens, ...rightTokens]);
  if (union.size === 0) return 1;
  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }
  return intersection / union.size;
}
