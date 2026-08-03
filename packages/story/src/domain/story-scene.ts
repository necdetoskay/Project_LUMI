import type { SceneType, TransitionType } from "./story-types";
import { ValidationError } from "./errors";
import { validateNarrativeText, validateSceneKey, validateSequence } from "./validation";

export interface CreateStorySceneInput {
  storyVersionId: string;
  sceneKey: string;
  sequenceNumber: number;
  sceneType: SceneType;
  title?: string | undefined;
  narrativeText: string;
  isEntryScene?: boolean | undefined;
  isTerminalScene?: boolean | undefined;
}

export class StoryScene {
  private constructor(
    public readonly id: string,
    public readonly storyVersionId: string,
    public readonly sceneKey: string,
    public readonly sequenceNumber: number,
    public readonly sceneType: SceneType,
    public readonly title: string | null,
    public readonly narrativeText: string,
    public readonly isEntry: boolean,
    public readonly isTerminal: boolean,
    public readonly metadata: Record<string, unknown>,
    public readonly createdAt: Date,
  ) {}

  static create(input: CreateStorySceneInput): StoryScene {
    const metadata: Record<string, unknown> = {};
    return new StoryScene(
      crypto.randomUUID(),
      input.storyVersionId,
      validateSceneKey(input.sceneKey),
      validateSequence(input.sequenceNumber, "sequenceNumber"),
      input.sceneType,
      input.title?.trim() ?? null,
      validateNarrativeText(input.narrativeText),
      input.isEntryScene ?? false,
      input.isTerminalScene ?? false,
      metadata,
      new Date(),
    );
  }
}

export interface CreateStorySceneTransitionInput {
  storyVersionId: string;
  fromSceneId: string;
  toSceneId: string;
  transitionType: TransitionType;
  priority?: number | undefined;
}

export class StorySceneTransition {
  public readonly priority: number;

  private constructor(
    public readonly id: string,
    public readonly storyVersionId: string,
    public readonly fromSceneId: string,
    public readonly toSceneId: string,
    public readonly transitionType: TransitionType,
    priority: number,
    public readonly createdAt: Date,
  ) {
    this.priority = priority;
  }

  static create(input: CreateStorySceneTransitionInput): StorySceneTransition {
    return new StorySceneTransition(
      crypto.randomUUID(),
      input.storyVersionId,
      input.fromSceneId,
      input.toSceneId,
      input.transitionType,
      input.priority ?? 0,
      new Date(),
    );
  }

  static validateScopes(
    transitions: StorySceneTransition[],
    sceneIds: Set<string>,
    versionId: string,
  ): void {
    for (const t of transitions) {
      if (t.storyVersionId !== versionId) {
        throw new ValidationError("INVALID_TRANSITION_SCOPE", "Transition must belong to the same story version");
      }
      if (!sceneIds.has(t.fromSceneId) || !sceneIds.has(t.toSceneId)) {
        throw new ValidationError("INVALID_TRANSITION_SCOPE", "Transition endpoints must reference scenes in the same version");
      }
    }
  }
}