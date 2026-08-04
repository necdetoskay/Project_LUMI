import type {
  StorySessionState,
  SessionStatus,
  PlaybackMode,
} from "./story-types";
import { SESSION_STATUSES, assertKnownSessionStatus } from "./story-types";
import { ValidationError } from "./errors";
import { validateId } from "./validation";

export interface CreateStorySessionInput {
  householdId: string;
  childProfileId: string;
  worldId: string;
  storyDefinitionId: string;
  storyVersionId: string;
  playbackMode?: PlaybackMode;
}

const PROGRESSABLE: SessionStatus[] = ["active"];
const PAUSABLE: SessionStatus[] = ["active"];
const RESUMABLE: SessionStatus[] = ["paused"];

export class StorySession {
  private constructor(private state: StorySessionState) {}

  static create(input: CreateStorySessionInput): StorySession {
    const id = crypto.randomUUID();
    const now = new Date();

    const state: StorySessionState = {
      id,
      householdId: validateId(input.householdId, "householdId"),
      childProfileId: validateId(input.childProfileId, "childProfileId"),
      worldId: validateId(input.worldId, "worldId"),
      storyDefinitionId: validateId(
        input.storyDefinitionId,
        "storyDefinitionId",
      ),
      storyVersionId: validateId(input.storyVersionId, "storyVersionId"),
      currentSceneId: null,
      sessionStatus: "created",
      playbackMode: input.playbackMode ?? "reading",
      startedAt: null,
      lastInteractedAt: null,
      pausedAt: null,
      completedAt: null,
      abandonmentReason: null,
      contextSnapshot: {},
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    return new StorySession(state);
  }

  static fromState(state: StorySessionState): StorySession {
    assertKnownSessionStatus(state.sessionStatus);
    return new StorySession(state);
  }

  getState(): StorySessionState {
    return { ...this.state };
  }

  get id(): string {
    return this.state.id;
  }

  get householdId(): string {
    return this.state.householdId;
  }

  get childProfileId(): string {
    return this.state.childProfileId;
  }

  get storyVersionId(): string {
    return this.state.storyVersionId;
  }

  get status(): SessionStatus {
    return this.state.sessionStatus;
  }

  get version(): number {
    return this.state.version;
  }

  get currentSceneId(): string | null {
    return this.state.currentSceneId;
  }

  isTerminal(): boolean {
    return (
      this.state.sessionStatus === "completed" ||
      this.state.sessionStatus === "abandoned" ||
      this.state.sessionStatus === "failed"
    );
  }

  private assertNotTerminal(action: string): void {
    if (this.isTerminal()) {
      throw new ValidationError(
        "SESSION_TERMINAL",
        `Cannot ${action} a ${this.state.sessionStatus} session`,
      );
    }
  }

  private touch(): void {
    this.state.updatedAt = new Date();
    this.state.lastInteractedAt = new Date();
    this.state.version += 1;
  }

  start(entrySceneId: string): void {
    this.assertNotTerminal("start");
    if (this.state.sessionStatus === "active") {
      throw new ValidationError(
        "SESSION_ALREADY_ACTIVE",
        "Session is already active",
      );
    }
    this.state.sessionStatus = "active";
    this.state.currentSceneId = entrySceneId;
    this.state.startedAt = new Date();
    this.touch();
  }

  pause(): void {
    this.assertNotTerminal("pause");
    if (!PAUSABLE.includes(this.state.sessionStatus)) {
      throw new ValidationError(
        "SESSION_INVALID_TRANSITION",
        `Cannot pause a session in ${this.state.sessionStatus} state`,
      );
    }
    this.state.sessionStatus = "paused";
    this.state.pausedAt = new Date();
    this.touch();
  }

  resume(): void {
    this.assertNotTerminal("resume");
    if (!RESUMABLE.includes(this.state.sessionStatus)) {
      throw new ValidationError(
        "SESSION_INVALID_TRANSITION",
        `Cannot resume a session in ${this.state.sessionStatus} state`,
      );
    }
    this.state.sessionStatus = "active";
    this.state.pausedAt = null;
    this.touch();
  }

  advance(nextSceneId: string): void {
    this.assertNotTerminal("advance");
    if (!PROGRESSABLE.includes(this.state.sessionStatus)) {
      throw new ValidationError(
        "SESSION_INVALID_TRANSITION",
        `Cannot advance a session in ${this.state.sessionStatus} state`,
      );
    }
    this.state.currentSceneId = nextSceneId;
    this.touch();
  }

  complete(): void {
    this.assertNotTerminal("complete");
    if (!PROGRESSABLE.includes(this.state.sessionStatus)) {
      throw new ValidationError(
        "SESSION_INVALID_TRANSITION",
        `Cannot complete a session in ${this.state.sessionStatus} state`,
      );
    }
    this.state.sessionStatus = "completed";
    this.state.completedAt = new Date();
    this.state.pausedAt = null;
    this.touch();
  }

  abandon(reason?: string): void {
    this.assertNotTerminal("abandon");
    if (this.state.sessionStatus === "completed") {
      throw new ValidationError(
        "SESSION_ALREADY_COMPLETED",
        "A completed session cannot be abandoned",
      );
    }
    this.state.sessionStatus = "abandoned";
    this.state.abandonmentReason = reason?.trim() ?? null;
    this.touch();
  }

  snapshot(): Record<string, unknown> {
    return {
      ...this.state.contextSnapshot,
    };
  }

  setContextSnapshot(snapshot: Record<string, unknown>): void {
    this.state.contextSnapshot = { ...snapshot };
    this.state.updatedAt = new Date();
  }
}

export const isValidSessionStatus = (value: string): value is SessionStatus =>
  (SESSION_STATUSES as readonly string[]).includes(value);
