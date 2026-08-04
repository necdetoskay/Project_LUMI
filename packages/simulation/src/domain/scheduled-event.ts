import type { TimePhase } from "./time";

export const SCHEDULED_EVENT_TYPES = [
  "world_weather_change",
  "npc_schedule_shift",
  "location_discovery_unlocked",
  "ecology_cycle",
  "story_milestone_reminder",
  "child_return_greeting",
] as const;
export type ScheduledEventType = (typeof SCHEDULED_EVENT_TYPES)[number];

export interface ScheduledEventState {
  id: string;
  worldId: string;
  householdId: string;
  scheduledAt: Date;
  eventType: ScheduledEventType;
  /** Critical/irreversible events are never auto-resolved while child is absent. */
  critical: boolean;
  /** Player-preserved events wait for explicit player action. */
  playerPreserved: boolean;
  payload: Record<string, unknown>;
  resolved: boolean;
  resolvedAt: Date | null;
  createdAt: Date;
}

export interface SimulationScheduledEvent {
  id: string;
  worldId: string;
  householdId: string;
  scheduledAt: Date;
  eventType: ScheduledEventType;
  critical: boolean;
  playerPreserved: boolean;
  payload: Record<string, unknown>;
  resolved: boolean;
  resolvedAt: Date | null;
  createdAt: Date;
}

export interface CreateScheduledEventInput {
  worldId: string;
  householdId: string;
  scheduledAt: Date;
  eventType: ScheduledEventType;
  critical?: boolean;
  playerPreserved?: boolean;
  payload?: Record<string, unknown>;
}

export type SimulationRunStatus = "planned" | "running" | "completed" | "failed";

export interface SimulationRunState {
  id: string;
  worldId: string;
  householdId: string;
  childLastSeenAt: Date;
  childAbsentDays: number;
  timePhase: TimePhase;
  budgetTokens: number;
  runHash: string;
  status: SimulationRunStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  checkpointId: string | null;
  createdAt: Date;
}

export interface CreateSimulationRunInput {
  worldId: string;
  householdId: string;
  childLastSeenAt: Date;
  childAbsentDays: number;
  timePhase: TimePhase;
  budgetTokens: number;
  checkpointId?: string | null;
}
