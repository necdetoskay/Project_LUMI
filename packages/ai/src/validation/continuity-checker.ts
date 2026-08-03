import type { ValidationFinding } from "../domain/validation-types";

export interface ContinuityInput {
  knownEntities: string[];
  previousCharacterNames: string[];
  previousSettings: string[];
  currentSceneText: string;
}

export const CONTINUITY_CODE = "CONTINUITY-001";
export const CONTINUITY_CONTRADICTION_CODE = "CONTINUITY-002";

export class ContinuityChecker {
  public check(input: ContinuityInput): ValidationFinding[] {
    const findings: ValidationFinding[] = [];

    if (input.knownEntities.length > 0) {
      const missing = input.knownEntities.filter(
        (entity) =>
          !input.currentSceneText.toLowerCase().includes(entity.toLowerCase()),
      );
      if (missing.length === input.knownEntities.length) {
        findings.push({
          kind: "continuity",
          code: CONTINUITY_CODE,
          message: `Scene does not reference any known entities (${missing.slice(0, 3).join(", ")}...).`,
          severity: "warning",
        });
      }
    }

    if (
      input.previousSettings.length > 0 &&
      input.currentSceneText.length > 0
    ) {
      const lowerText = input.currentSceneText.toLowerCase();
      const hasContradiction = input.previousSettings.some((setting) => {
        const lowerSetting = setting.toLowerCase();
        return (
          lowerText.includes(`${lowerSetting} disappeared`) ||
          lowerText.includes(`${lowerSetting} vanished`)
        );
      });
      if (hasContradiction) {
        findings.push({
          kind: "continuity",
          code: CONTINUITY_CONTRADICTION_CODE,
          message: "Scene contradicts previously established setting.",
          severity: "error",
        });
      }
    }

    return findings;
  }
}
