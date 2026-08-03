import type { CandidateSafety } from "../domain";

/** Numeric safety component value per candidate safety level. */
export const SAFETY_COMPONENT: Record<CandidateSafety, number> = {
  safe: 1,
  conditional: 0.5,
  blocked: 0,
};
