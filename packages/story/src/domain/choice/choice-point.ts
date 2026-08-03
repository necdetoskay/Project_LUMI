import { ValidationError } from "../errors";
import { assertKnownChoicePointType, type ChoicePointType } from "./choice-types";

export interface CreateChoicePointInput {
  storyVersionId: string;
  sceneId: string;
  choicePointKey: string;
  choicePointType: ChoicePointType;
  promptText: string;
  sequenceNumber?: number | undefined;
  ruleVersion?: number | undefined;
}

export interface ChoicePointState {
  id: string;
  storyVersionId: string;
  sceneId: string;
  choicePointKey: string;
  choicePointType: ChoicePointType;
  promptText: string;
  sequenceNumber: number;
  ruleVersion: number;
  createdAt: Date;
}

export class ChoicePoint {
  private constructor(private readonly state: ChoicePointState) {}

  static create(input: CreateChoicePointInput): ChoicePoint {
    assertKnownChoicePointType(input.choicePointType);
    const now = new Date();
    return new ChoicePoint({
      id: crypto.randomUUID(),
      storyVersionId: input.storyVersionId,
      sceneId: input.sceneId,
      choicePointKey: validateChoicePointKey(input.choicePointKey),
      choicePointType: input.choicePointType,
      promptText: validatePromptText(input.promptText),
      sequenceNumber: input.sequenceNumber ?? 0,
      ruleVersion: input.ruleVersion ?? 1,
      createdAt: now,
    });
  }

  static fromState(state: ChoicePointState): ChoicePoint {
    assertKnownChoicePointType(state.choicePointType);
    return new ChoicePoint(state);
  }

  get id(): string {
    return this.state.id;
  }

  get sceneId(): string {
    return this.state.sceneId;
  }

  get storyVersionId(): string {
    return this.state.storyVersionId;
  }

  get choicePointKey(): string {
    return this.state.choicePointKey;
  }

  get ruleVersion(): number {
    return this.state.ruleVersion;
  }

  getState(): ChoicePointState {
    return { ...this.state };
  }
}

function validateChoicePointKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed || trimmed.length > 120) {
    throw new ValidationError("INVALID_CHOICE_POINT_KEY", "Choice point key must be 1-120 characters");
  }
  return trimmed;
}

function validatePromptText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 2000) {
    throw new ValidationError("INVALID_PROMPT_TEXT", "Prompt text must be 1-2000 characters");
  }
  return trimmed;
}
