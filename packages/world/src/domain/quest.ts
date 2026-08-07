import {
  validateId,
  validateDisplayName,
  validateQuestStatus,
  validateQuestObjectiveStatus,
} from "./validation";
import { ValidationError } from "./errors";
import type {
  QuestState,
  QuestStatus,
  QuestObjectiveState,
  QuestObjectiveStatus,
  QuestRewardState,
} from "./world-types";

export interface CreateQuestObjectiveInput {
  title: string;
  status?: QuestObjectiveStatus;
}

export interface CreateQuestInput {
  householdId: string;
  worldId: string;
  storySessionId?: string | null;
  title: string;
  summary: string;
  objectives: CreateQuestObjectiveInput[];
  reward?: QuestRewardState | null;
}

export interface ProgressObjectiveInput {
  objectiveIndex: number;
  evidenceRef: string;
}

export class Quest {
  private constructor(private state: QuestState) {}

  static create(input: CreateQuestInput): Quest {
    if (input.objectives.length === 0) {
      throw new ValidationError(
        "QUEST_NO_OBJECTIVES",
        "A quest must have at least one objective",
        "objectives",
      );
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const objectives: QuestObjectiveState[] = input.objectives.map(
      (o, index): QuestObjectiveState => ({
        index,
        title: validateDisplayName(o.title, "objectiveTitle"),
        status: validateQuestObjectiveStatus(o.status ?? "locked"),
        evidenceRef: null,
        completedAt: null,
      }),
    );

    const state: QuestState = {
      id,
      householdId: validateId(input.householdId, "householdId"),
      worldId: validateId(input.worldId, "worldId"),
      storySessionId: input.storySessionId ?? null,
      title: validateDisplayName(input.title),
      summary: input.summary,
      objectives,
      reward: input.reward ? { ...input.reward } : null,
      status: "inactive",
      version: 1,
      evidenceRef: null,
      createdAt: now,
      updatedAt: now,
    };

    return new Quest(state);
  }

  static fromState(state: QuestState): Quest {
    validateQuestStatus(state.status);
    for (const o of state.objectives) {
      validateQuestObjectiveStatus(o.status);
    }
    return new Quest(state);
  }

  getState(): QuestState {
    return {
      ...this.state,
      objectives: this.state.objectives.map((o) => ({ ...o })),
    };
  }

  get id(): string {
    return this.state.id;
  }

  get householdId(): string {
    return this.state.householdId;
  }

  get worldId(): string {
    return this.state.worldId;
  }

  get storySessionId(): string | null {
    return this.state.storySessionId;
  }

  get title(): string {
    return this.state.title;
  }

  get status(): QuestStatus {
    return this.state.status;
  }

  get version(): number {
    return this.state.version;
  }

  get objectives(): QuestObjectiveState[] {
    return this.state.objectives.map((o) => ({ ...o }));
  }

  activate(evidenceRef: string): void {
    if (this.state.status !== "inactive") {
      throw new ValidationError(
        "QUEST_INVALID_TRANSITION",
        `Cannot activate a quest in ${this.state.status} status`,
      );
    }
    this.state.status = "active";
    this.state.evidenceRef = evidenceRef;
    this.state.version += 1;
    this.state.updatedAt = new Date();
  }

  pause(evidenceRef: string): void {
    if (this.state.status !== "active") {
      throw new ValidationError(
        "QUEST_INVALID_TRANSITION",
        `Cannot pause a quest in ${this.state.status} status`,
      );
    }
    this.state.status = "paused";
    this.state.evidenceRef = evidenceRef;
    this.state.version += 1;
    this.state.updatedAt = new Date();
  }

  resume(evidenceRef: string): void {
    if (this.state.status !== "paused") {
      throw new ValidationError(
        "QUEST_INVALID_TRANSITION",
        `Cannot resume a quest in ${this.state.status} status`,
      );
    }
    this.state.status = "active";
    this.state.evidenceRef = evidenceRef;
    this.state.version += 1;
    this.state.updatedAt = new Date();
  }

  abandon(evidenceRef: string): void {
    if (
      this.state.status === "completed" ||
      this.state.status === "abandoned"
    ) {
      throw new ValidationError(
        "QUEST_INVALID_TRANSITION",
        `Cannot abandon a quest in ${this.state.status} status`,
      );
    }
    this.state.status = "abandoned";
    this.state.evidenceRef = evidenceRef;
    this.state.version += 1;
    this.state.updatedAt = new Date();
  }

  /**
   * Progresses an objective on an active quest. Only `active` quests accept
   * progression; `inactive` must be activated first, `paused` until resumed.
   * Completing the final objective auto-transitions the quest to `completed`.
   */
  progressObjective(input: ProgressObjectiveInput): void {
    if (this.state.status !== "active") {
      throw new ValidationError(
        "QUEST_INVALID_TRANSITION",
        `Cannot progress an objective on a ${this.state.status} quest`,
      );
    }

    const objective = this.state.objectives[input.objectiveIndex];
    if (!objective) {
      throw new ValidationError(
        "QUEST_OBJECTIVE_NOT_FOUND",
        `No objective at index ${input.objectiveIndex}`,
        "objectiveIndex",
      );
    }

    if (objective.status === "completed") {
      throw new ValidationError(
        "QUEST_OBJECTIVE_ALREADY_COMPLETED",
        `Objective ${input.objectiveIndex} is already completed`,
        "objectiveIndex",
      );
    }

    objective.status = "completed";
    objective.evidenceRef = input.evidenceRef;
    objective.completedAt = new Date();

    this.state.evidenceRef = input.evidenceRef;
    this.state.version += 1;
    this.state.updatedAt = new Date();

    if (this.state.objectives.every((o) => o.status === "completed")) {
      this.state.status = "completed";
      this.state.version += 1;
    }
  }
}

export const isTerminalQuestStatus = (value: string): value is QuestStatus =>
  (["completed", "abandoned"] as readonly string[]).includes(value);

export const isValidQuestObjectiveIndex = (
  quest: Quest,
  index: number,
): boolean => index >= 0 && index < quest.objectives.length;

/** Strongly typed objective status setter (used by the commit applicator). */
export function setQuestObjectiveStatus(
  quest: Quest,
  objectiveIndex: number,
  status: QuestObjectiveStatus,
  evidenceRef: string,
): void {
  if (quest.status !== "active") {
    throw new ValidationError(
      "QUEST_INVALID_TRANSITION",
      `Cannot mutate an objective on a ${quest.status} quest`,
    );
  }
  const objective = quest.objectives[objectiveIndex];
  if (!objective) {
    throw new ValidationError(
      "QUEST_OBJECTIVE_NOT_FOUND",
      `No objective at index ${objectiveIndex}`,
      "objectiveIndex",
    );
  }
  objective.status = status;
  objective.evidenceRef = evidenceRef;
  if (status === "completed") {
    objective.completedAt = new Date();
  }
}
