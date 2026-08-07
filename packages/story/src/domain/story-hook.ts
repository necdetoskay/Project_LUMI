import { validateId } from "./validation";
import { ValidationError } from "./errors";
import type { StoryHookState, HookType, SceneType } from "./story-types";
import { assertKnownHookType } from "./story-types";

export interface CreateStoryHookInput {
  householdId: string;
  childProfileId: string;
  storySessionId: string;
  worldId: string;
  opportunityId: string;
  hookType: HookType;
  sourceNpcId: string;
  targetNpcId?: string | null;
  payload: Record<string, unknown>;
  constraints: Record<string, unknown>;
  sceneType: SceneType;
}

export class StoryHook {
  private constructor(private state: StoryHookState) {}

  static create(input: CreateStoryHookInput): StoryHook {
    const id = crypto.randomUUID();
    const now = new Date();

    const state: StoryHookState = {
      id,
      householdId: validateId(input.householdId, "householdId"),
      childProfileId: validateId(input.childProfileId, "childProfileId"),
      storySessionId: validateId(input.storySessionId, "storySessionId"),
      worldId: validateId(input.worldId, "worldId"),
      opportunityId: validateId(input.opportunityId, "opportunityId"),
      hookType: input.hookType,
      sourceNpcId: validateId(input.sourceNpcId, "sourceNpcId"),
      targetNpcId: input.targetNpcId ?? null,
      payload: { ...input.payload },
      constraints: { ...input.constraints },
      sceneType: input.sceneType,
      status: "pending",
      version: 1,
      createdAt: now,
      consumedAt: null,
    };

    return new StoryHook(state);
  }

  static fromState(state: StoryHookState): StoryHook {
    assertKnownHookType(state.hookType);
    return new StoryHook(state);
  }

  getState(): StoryHookState {
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

  get storySessionId(): string {
    return this.state.storySessionId;
  }

  get opportunityId(): string {
    return this.state.opportunityId;
  }

  get hookType(): HookType {
    return this.state.hookType;
  }

  get sceneType(): SceneType {
    return this.state.sceneType;
  }

  get status(): string {
    return this.state.status;
  }

  get version(): number {
    return this.state.version;
  }

  consume(): void {
    if (this.state.status !== "pending") {
      throw new ValidationError(
        "HOOK_ALREADY_CONSUMED",
        `Cannot consume a hook in ${this.state.status} status`,
      );
    }
    this.state.status = "consumed";
    this.state.consumedAt = new Date();
    this.state.version += 1;
  }

  markDelivered(): void {
    if (this.state.status !== "pending") {
      throw new ValidationError(
        "HOOK_INVALID_TRANSITION",
        `Cannot deliver a hook in ${this.state.status} status`,
      );
    }
    this.state.status = "delivered";
    this.state.version += 1;
  }

  expire(): void {
    if (this.state.status !== "pending") {
      throw new ValidationError(
        "HOOK_INVALID_TRANSITION",
        `Cannot expire a hook in ${this.state.status} status`,
      );
    }
    this.state.status = "expired";
    this.state.version += 1;
  }
}

export const isValidHookStatus = (
  value: string,
): value is StoryHookState["status"] =>
  (
    ["pending", "delivered", "consumed", "expired"] as readonly string[]
  ).includes(value);
