import { ValidationError } from "../errors";

export interface CreateCommittedChoiceInput {
  storySessionId: string;
  choicePointId: string;
  optionId: string;
  evidenceSceneId: string;
  ruleVersion: number;
  actorUserId?: string | undefined;
}

export interface CommittedChoiceState {
  id: string;
  storySessionId: string;
  choicePointId: string;
  optionId: string;
  evidenceSceneId: string;
  ruleVersion: number;
  actorUserId: string | null;
  committedAt: Date;
}

export class CommittedChoice {
  private constructor(private readonly state: CommittedChoiceState) {}

  static create(input: CreateCommittedChoiceInput): CommittedChoice {
    return new CommittedChoice({
      id: crypto.randomUUID(),
      storySessionId: input.storySessionId,
      choicePointId: input.choicePointId,
      optionId: input.optionId,
      evidenceSceneId: input.evidenceSceneId,
      ruleVersion: input.ruleVersion,
      actorUserId: input.actorUserId ?? null,
      committedAt: new Date(),
    });
  }

  static fromState(state: CommittedChoiceState): CommittedChoice {
    return new CommittedChoice(state);
  }

  get id(): string {
    return this.state.id;
  }

  get storySessionId(): string {
    return this.state.storySessionId;
  }

  get choicePointId(): string {
    return this.state.choicePointId;
  }

  get optionId(): string {
    return this.state.optionId;
  }

  get evidenceSceneId(): string {
    return this.state.evidenceSceneId;
  }

  get ruleVersion(): number {
    return this.state.ruleVersion;
  }

  getState(): CommittedChoiceState {
    return { ...this.state };
  }
}

export function assertSingleCommit(
  existing: CommittedChoiceState | undefined,
  requestedOptionId: string,
): void {
  if (existing && existing.optionId !== requestedOptionId) {
    throw new ValidationError(
      "CHOICE_ALREADY_COMMITTED",
      "This choice point has already been committed with a different option",
    );
  }
}
