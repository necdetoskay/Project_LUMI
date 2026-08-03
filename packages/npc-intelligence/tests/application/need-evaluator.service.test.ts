import { describe, expect, it } from "vitest";
import { NeedEvaluator } from "../../src/application/need-evaluator.service";
import type { NeedEvaluationInput } from "../../src/domain";

function buildInput(
  overrides: Partial<NeedEvaluationInput> = {},
): NeedEvaluationInput {
  return {
    needs: [{ needType: "safety", value: 0.8, decay: 0.4 }],
    timeSensitivity: 0.2,
    conditions: [],
    ...overrides,
  };
}

describe("NeedEvaluator", () => {
  it("computes urgency from current value and decay-weighted time sensitivity", () => {
    const service = new NeedEvaluator();
    const result = service.evaluate(buildInput());

    const safety = result.pressures.find((p) => p.needType === "safety");
    expect(safety).toMatchObject({ current: 0.8, decay: 0.4 });
    expect(safety?.urgency).toBeCloseTo(0.8 + 0.4 * 0.2, 6);
    expect(result.dominantNeedType).toBe("safety");
  });

  it("marks the highest-urgency need as dominant", () => {
    const service = new NeedEvaluator();
    const result = service.evaluate(
      buildInput({
        needs: [
          { needType: "hunger", value: 0.3, decay: 0.1 },
          { needType: "safety", value: 0.9, decay: 0.3 },
        ],
      }),
    );

    expect(result.dominantNeedType).toBe("safety");
  });

  it("applies condition effects to needs and raises time sensitivity", () => {
    const service = new NeedEvaluator();
    const result = service.evaluate(
      buildInput({
        needs: [],
        conditions: ["injured"],
      }),
    );

    const safety = result.pressures.find((p) => p.needType === "safety");
    expect(safety).toMatchObject({ current: 0.5, source: "condition" });
    const rest = result.pressures.find((p) => p.needType === "rest");
    expect(rest?.current).toBeCloseTo(0.3, 6);
  });

  it("an injured NPC prioritizes safety over moderate other needs", () => {
    const service = new NeedEvaluator();
    const result = service.evaluate(
      buildInput({
        needs: [{ needType: "curiosity", value: 0.3, decay: 0.1 }],
        conditions: ["injured"],
      }),
    );

    expect(result.dominantNeedType).toBe("safety");
    const safety = result.pressures.find((p) => p.needType === "safety");
    expect(safety?.urgency).toBeGreaterThan(
      result.pressures.find((p) => p.needType === "curiosity")?.urgency ?? 0,
    );
  });

  it("returns null dominant need when nothing pressures the NPC", () => {
    const service = new NeedEvaluator();
    const result = service.evaluate(buildInput({ needs: [] }));

    expect(result.dominantNeedType).toBeNull();
    expect(result.urgency).toBe(0);
  });

  it("combines multiple pressures into an aggregate urgency", () => {
    const service = new NeedEvaluator();
    const result = service.evaluate(
      buildInput({
        needs: [
          { needType: "hunger", value: 0.5, decay: 0.2 },
          { needType: "rest", value: 0.6, decay: 0.2 },
          { needType: "safety", value: 0.9, decay: 0.3 },
        ],
      }),
    );

    expect(result.urgency).toBeGreaterThan(0);
    expect(result.urgency).toBeLessThanOrEqual(1);
  });
});
