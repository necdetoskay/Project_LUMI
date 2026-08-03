import type { NeedType } from "@lumi/profiles";

export type NeedPressureSource = "need_state" | "condition" | "goal";

export interface NeedPressure {
  needType: NeedType;
  /** 0..1 tension where 1 means the need is critical. */
  current: number;
  /** 0..1 decay-driven urgency drift. */
  decay: number;
  /** 0..1 combined urgency used for ranking. */
  urgency: number;
  source: NeedPressureSource;
}

export interface NeedConditionEffects {
  needs: Partial<Record<NeedType, number>>;
  timeSensitivity: number;
}

export const CONDITION_EFFECTS = {
  injured: {
    needs: { safety: 0.5, rest: 0.3 },
    timeSensitivity: 0.4,
  },
  hungry: {
    needs: { hunger: 0.4 },
    timeSensitivity: 0.1,
  },
  cold: {
    needs: { rest: 0.2, safety: 0.2 },
    timeSensitivity: 0.2,
  },
  threatened: {
    needs: { safety: 0.6 },
    timeSensitivity: 0.5,
  },
  lonely: {
    needs: { belonging: 0.4, love: 0.3 },
    timeSensitivity: 0,
  },
} as const satisfies Record<string, NeedConditionEffects>;

export type NpcCondition = keyof typeof CONDITION_EFFECTS;

export interface NeedEvaluationInput {
  needs: Array<{ needType: NeedType; value: number; decay: number }>;
  timeSensitivity: number;
  conditions: NpcCondition[];
}

export interface NeedEvaluationResult {
  pressures: NeedPressure[];
  dominantNeedType: NeedType | null;
  /** 0..1 aggregate urgency across all pressures. */
  urgency: number;
}
