import { describe, expect, it } from "vitest";

import {
  calculateJudgeHumanAgreement,
  checkNarrativeStateConsistency,
  createStoryArcEvaluationPayload,
  STORY_ARC_RUBRIC_V1,
  type CandidateEvaluation,
  type JudgeConsensus,
} from "../src/test-lab";

describe("evaluation consistency", () => {
  it("surfaces narrative item loss when resulting inventory still retains the item", () => {
    const report = checkNarrativeStateConsistency({
      narrative:
        "Lumi mağaranın çıkışında Gümüş Anahtarı kaybetti ve onsuz yoluna devam etti.",
      beforeState: {
        inventory: [{ id: "silver-key", name: "Gümüş Anahtar" }],
      },
      afterState: {
        inventory: [{ id: "silver-key", name: "Gümüş Anahtar" }],
      },
    });

    expect(report.consistent).toBe(false);
    expect(report.issues).toEqual([
      expect.objectContaining({
        code: "ITEM_RETAINED_AFTER_LOSS",
        itemKey: "gümüş_anahtar",
      }),
    ]);
  });

  it("does not report item loss when inventory reflects the narrative", () => {
    const report = checkNarrativeStateConsistency({
      narrative: "Lumi Gümüş Anahtarı kaybetti ve onsuz eve döndü.",
      beforeState: { inventory: ["Gümüş Anahtar"] },
      afterState: { inventory: [] },
    });

    expect(report).toEqual({ consistent: true, issues: [] });
  });

  it("keeps judge-vs-human agreement inspectable without replacing either score", () => {
    const judgeConsensus: JudgeConsensus[] = [
      consensus("candidate-a", 8.5),
      consensus("candidate-b", 6),
    ];
    const humanEvaluations = [
      human("human-a", "candidate-a", 9),
      human("human-b", "candidate-b", 5),
    ];

    const agreement = calculateJudgeHumanAgreement({
      judgeConsensus,
      humanEvaluations,
    });

    expect(agreement.candidateCount).toBe(2);
    expect(agreement.meanAbsoluteScoreDifference).toBe(0.75);
    expect(agreement.rankingAgreement).toBe(1);
    expect(agreement.perCandidate).toEqual([
      {
        candidateId: "candidate-a",
        judgeMeanScore: 8.5,
        humanMeanScore: 9,
        absoluteDifference: 0.5,
      },
      {
        candidateId: "candidate-b",
        judgeMeanScore: 6,
        humanMeanScore: 5,
        absoluteDifference: 1,
      },
    ]);
  });

  it("builds a long-horizon arc payload with continuity and repetition signals", () => {
    const payload = createStoryArcEvaluationPayload([
      {
        storyId: "story-1",
        narrative:
          "Lumi ormanda eski bir kapı buldu ve tilki Mira ile tanıştı.",
        resultingState: {
          character: { courage: 2 },
          world: { gateOpen: false },
          npcs: { mira: { trust: 1 } },
        },
      },
      {
        storyId: "story-2",
        narrative:
          "Lumi Mira ile kapının sırrını çözdü ve cesaretini gösterdi.",
        resultingState: {
          character: { courage: 3 },
          world: { gateOpen: true },
          npcs: { mira: { trust: 2 } },
        },
      },
      {
        storyId: "story-3",
        narrative:
          "Lumi yeni açılan kapıdan geçip başka bir vadinin izini buldu.",
        resultingState: {
          character: { courage: 3 },
          world: { gateOpen: true, valleyKnown: true },
          npcs: { mira: { trust: 2 } },
        },
      },
    ]);

    expect(payload.storyCount).toBe(3);
    expect(payload.continuitySignals).toEqual({
      characterStateChanges: 1,
      worldStateChanges: 2,
      npcStateChanges: 1,
      repeatedNarrativePairs: 0,
    });
    expect(payload.stories).toHaveLength(3);
    expect(STORY_ARC_RUBRIC_V1.targetType).toBe("story_arc");
    expect(STORY_ARC_RUBRIC_V1.criteria.map((item) => item.key)).toEqual([
      "long_term_continuity",
      "character_development",
      "world_evolution",
      "npc_consistency",
      "repetition_avoidance",
      "arc_progression",
    ]);
  });
});

function consensus(candidateId: string, meanScore: number): JudgeConsensus {
  return {
    candidateId,
    judgeCount: 2,
    meanScore,
    minScore: meanScore - 0.5,
    maxScore: meanScore + 0.5,
    variance: 0.25,
    scores: [
      { judgeId: "judge-1", score: meanScore - 0.5 },
      { judgeId: "judge-2", score: meanScore + 0.5 },
    ],
  };
}

function human(
  id: string,
  candidateId: string,
  overallScore: number,
): CandidateEvaluation {
  return {
    id,
    evaluationExecutionId: `execution-${id}`,
    sessionId: "session-1",
    runId: `run-${candidateId}`,
    candidateId,
    rubricKey: "story_quality",
    rubricRevision: 1,
    mode: "absolute",
    authorType: "human",
    authorId: "parent-user",
    judgeModelSlug: null,
    findings: [],
    overallScore,
    rank: null,
    createdAt: "2026-08-18T14:20:00.000Z",
  };
}
