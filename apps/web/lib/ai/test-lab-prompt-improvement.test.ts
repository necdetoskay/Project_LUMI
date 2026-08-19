import { describe, expect, it } from "vitest";

import {
  appendPromptImprovementBlock,
  buildPromptImprovementPlan,
} from "./test-lab-prompt-improvement";

const criteria = [
  {
    key: "curiosity",
    label: "Curiosity",
    description: "curiosity",
    weight: 1,
    minScore: 1,
    maxScore: 10,
  },
  {
    key: "continuity",
    label: "Continuity",
    description: "continuity",
    weight: 1,
    minScore: 1,
    maxScore: 10,
  },
  {
    key: "age_suitability",
    label: "Age suitability",
    description: "age",
    weight: 1,
    minScore: 1,
    maxScore: 10,
  },
];

describe("buildPromptImprovementPlan", () => {
  it("targets the weakest normalized criterion and preserves strong criteria", () => {
    const plan = buildPromptImprovementPlan({
      criteria,
      findings: [
        {
          criterionKey: "curiosity",
          score: 4,
          finding: "Mystery resolves too quickly.",
          evidence: "The answer is revealed in the same paragraph.",
        },
        {
          criterionKey: "continuity",
          score: 9,
          finding: "Prior state is used well.",
          evidence: null,
        },
        {
          criterionKey: "age_suitability",
          score: 10,
          finding: "Language fits the age band.",
          evidence: null,
        },
      ],
    });

    expect(plan).not.toBeNull();
    expect(plan).toMatchObject({
      targetCriterionKey: "curiosity",
      targetCriterionLabel: "Curiosity",
      targetScore: 33,
      preserveCriteria: ["Continuity", "Age suitability"],
    });
    expect(plan?.recommendation).toContain("Merak boşluğu oluştur");
    expect(plan?.promptInstructionBlock).toContain(
      "[LUMI_TEST_LAB_OPTIMIZATION_V1]",
    );
    expect(plan?.promptInstructionBlock).toContain(
      "Koruma kısıtı: Continuity, Age suitability",
    );
  });

  it("returns null when findings cannot be matched to rubric criteria", () => {
    expect(
      buildPromptImprovementPlan({
        criteria,
        findings: [
          {
            criterionKey: "missing",
            score: 1,
            finding: "x",
            evidence: null,
          },
        ],
      }),
    ).toBeNull();
  });
});

describe("appendPromptImprovementBlock", () => {
  it("keeps only one immutable optimization block on repeated drafts", () => {
    const first = appendPromptImprovementBlock(
      "Base prompt",
      "[LUMI_TEST_LAB_OPTIMIZATION_V1]\nfirst\n[/LUMI_TEST_LAB_OPTIMIZATION_V1]",
    );
    const second = appendPromptImprovementBlock(
      first,
      "[LUMI_TEST_LAB_OPTIMIZATION_V1]\nsecond\n[/LUMI_TEST_LAB_OPTIMIZATION_V1]",
    );

    expect(second).toContain("Base prompt");
    expect(second).not.toContain("first");
    expect(second).toContain("second");
    expect(second.match(/\[LUMI_TEST_LAB_OPTIMIZATION_V1\]/g)?.length).toBe(1);
  });
});
