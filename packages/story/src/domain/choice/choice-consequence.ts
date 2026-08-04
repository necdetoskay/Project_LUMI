import {
  assertKnownConsequenceType,
  type ConsequenceType,
} from "./choice-types";

export interface CreateChoiceConsequenceInput {
  storySessionId: string;
  committedChoiceId: string;
  consequenceType: ConsequenceType;
  targetKey?: string | undefined;
  payload: Record<string, unknown>;
  sequenceNumber?: number | undefined;
}

export interface ChoiceConsequenceState {
  id: string;
  storySessionId: string;
  committedChoiceId: string;
  consequenceType: ConsequenceType;
  targetKey: string | null;
  payload: Record<string, unknown>;
  sequenceNumber: number;
  createdAt: Date;
}

export class ChoiceConsequence {
  private constructor(private readonly state: ChoiceConsequenceState) {}

  static create(input: CreateChoiceConsequenceInput): ChoiceConsequence {
    assertKnownConsequenceType(input.consequenceType);
    return new ChoiceConsequence({
      id: crypto.randomUUID(),
      storySessionId: input.storySessionId,
      committedChoiceId: input.committedChoiceId,
      consequenceType: input.consequenceType,
      targetKey: input.targetKey ?? null,
      payload: { ...input.payload },
      sequenceNumber: input.sequenceNumber ?? 0,
      createdAt: new Date(),
    });
  }

  static fromState(state: ChoiceConsequenceState): ChoiceConsequence {
    assertKnownConsequenceType(state.consequenceType);
    return new ChoiceConsequence(state);
  }

  get id(): string {
    return this.state.id;
  }

  get consequenceType(): ConsequenceType {
    return this.state.consequenceType;
  }

  getState(): ChoiceConsequenceState {
    return { ...this.state, payload: { ...this.state.payload } };
  }
}
