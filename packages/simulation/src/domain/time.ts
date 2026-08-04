export const TIME_PHASES = ["normal", "reduced", "limited", "frozen"] as const;
export type TimePhase = (typeof TIME_PHASES)[number];

export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export const TIME_OF_DAY = [
  "dawn",
  "morning",
  "noon",
  "afternoon",
  "evening",
  "dusk",
  "night",
] as const;
export type TimeOfDay = (typeof TIME_OF_DAY)[number];

export interface AbsencePolicySegment {
  /** Inclusive lower bound (real-world days absent). */
  minDays: number;
  /** Exclusive upper bound (real-world days absent). */
  maxDays: number;
  /** Simulation intensity for this segment. */
  phase: TimePhase;
  /** Maximum simulation tokens budget for this segment. */
  budgetTokens: number;
  /** Whether NPC autonomous decisions run during this segment. */
  allowNpcDecisions: boolean;
  /** Whether environment/ecology changes can commit during this segment. */
  allowEnvironmentChanges: boolean;
  /** Whether new scheduled events can be created during this segment. */
  allowNewEvents: boolean;
}

export const ABSENCE_POLICY: readonly AbsencePolicySegment[] = [
  {
    minDays: 0,
    maxDays: 4,
    phase: "normal",
    budgetTokens: 200,
    allowNpcDecisions: true,
    allowEnvironmentChanges: true,
    allowNewEvents: true,
  },
  {
    minDays: 4,
    maxDays: 8,
    phase: "reduced",
    budgetTokens: 100,
    allowNpcDecisions: true,
    allowEnvironmentChanges: false,
    allowNewEvents: false,
  },
  {
    minDays: 8,
    maxDays: 10,
    phase: "limited",
    budgetTokens: 40,
    allowNpcDecisions: false,
    allowEnvironmentChanges: false,
    allowNewEvents: false,
  },
  {
    minDays: 10,
    maxDays: Infinity,
    phase: "frozen",
    budgetTokens: 0,
    allowNpcDecisions: false,
    allowEnvironmentChanges: false,
    allowNewEvents: false,
  },
];

export const FREEZE_DAY_THRESHOLD = 10;

export interface WorldClockState {
  worldId: string;
  householdId: string;
  currentDay: number;
  currentHour: number;
  currentMinute: number;
  season: Season;
  lastAdvancedAt: Date | null;
  clockHash: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AbsenceInfo {
  childLastSeenAt: Date;
  absentDays: number;
  now: Date;
}

export interface AbsencePolicyResult {
  phase: TimePhase;
  segment: AbsencePolicySegment;
  budgetTokens: number;
  frozen: boolean;
}

export function computeAbsencePolicy(
  absence: AbsenceInfo,
): AbsencePolicyResult {
  const days = absence.absentDays;
  for (const segment of ABSENCE_POLICY) {
    if (days >= segment.minDays && days < segment.maxDays) {
      return {
        phase: segment.phase,
        segment,
        budgetTokens: segment.budgetTokens,
        frozen: segment.phase === "frozen",
      };
    }
  }
  const last = ABSENCE_POLICY[ABSENCE_POLICY.length - 1];
  return {
    phase: last!.phase,
    segment: last!,
    budgetTokens: last!.budgetTokens,
    frozen: true,
  };
}

export function assertKnownTimePhase(
  value: string,
): asserts value is TimePhase {
  if (!TIME_PHASES.includes(value as never)) {
    throw new Error(`Invalid time phase: ${value}`);
  }
}

export function assertKnownSeason(value: string): asserts value is Season {
  if (!SEASONS.includes(value as never)) {
    throw new Error(`Invalid season: ${value}`);
  }
}
