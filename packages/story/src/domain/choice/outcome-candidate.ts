import { ValidationError } from "../errors";
import { assertKnownOutcomeCandidateStatus, type OutcomeCandidateStatus } from "./choice-types";

export interface CreateOutcomeCandidateInput {
  storySessionId: string;
  sourceConsequenceId: string;
  candidateSchemaVersion: number;
  payload: Record<string, unknown>;
  status?: OutcomeCandidateStatus | undefined;
}

export interface OutcomeCandidateState {
  id: string;
  storySessionId: string;
  sourceConsequenceId: string;
  candidateSchemaVersion: number;
  payload: Record<string, unknown>;
  status: OutcomeCandidateStatus;
  createdAt: Date;
}

export class OutcomeCandidate {
  private constructor(private readonly state: OutcomeCandidateState) {}

  static create(input: CreateOutcomeCandidateInput): OutcomeCandidate {
    const status = input.status ?? "pending";
    assertKnownOutcomeCandidateStatus(status);
    if (input.candidateSchemaVersion <= 0) {
      throw new ValidationError("INVALID_SCHEMA_VERSION", "Outcome candidate schema version must be positive");
    }
    return new OutcomeCandidate({
      id: crypto.randomUUID(),
      storySessionId: input.storySessionId,
      sourceConsequenceId: input.sourceConsequenceId,
      candidateSchemaVersion: input.candidateSchemaVersion,
      payload: { ...input.payload },
      status,
      createdAt: new Date(),
    });
  }

  static fromState(state: OutcomeCandidateState): OutcomeCandidate {
    assertKnownOutcomeCandidateStatus(state.status);
    return new OutcomeCandidate(state);
  }

  get id(): string {
    return this.state.id;
  }

  get storySessionId(): string {
    return this.state.storySessionId;
  }

  get status(): OutcomeCandidateStatus {
    return this.state.status;
  }

  getState(): OutcomeCandidateState {
    return { ...this.state, payload: { ...this.state.payload } };
  }
}
