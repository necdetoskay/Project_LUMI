import type { PromptRegistryState } from "./prompt-types";
import { validateId, validatePromptKey, validatePurpose } from "./validation";

export interface CreatePromptRegistryInput {
  householdId: string;
  promptKey: string;
  purpose?: string | undefined;
}

export class PromptRegistry {
  private constructor(private state: PromptRegistryState) {}

  static create(input: CreatePromptRegistryInput): PromptRegistry {
    const id = crypto.randomUUID();
    const now = new Date();

    const state: PromptRegistryState = {
      id,
      householdId: validateId(input.householdId, "householdId"),
      promptKey: validatePromptKey(input.promptKey),
      purpose: validatePurpose(input.purpose),
      createdAt: now,
      updatedAt: now,
    };

    return new PromptRegistry(state);
  }

  static fromState(state: PromptRegistryState): PromptRegistry {
    return new PromptRegistry(state);
  }

  getState(): PromptRegistryState {
    return { ...this.state };
  }

  get id(): string {
    return this.state.id;
  }

  get householdId(): string {
    return this.state.householdId;
  }

  get promptKey(): string {
    return this.state.promptKey;
  }

  get purpose(): string {
    return this.state.purpose;
  }

  setPurpose(purpose: string): void {
    this.state.purpose = validatePurpose(purpose);
    this.state.updatedAt = new Date();
  }
}
