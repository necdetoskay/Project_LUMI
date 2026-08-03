import type { PromptActivationState } from "./prompt-types";
import { ValidationError } from "./errors";
import { validateId } from "./validation";

export interface CreatePromptActivationInput {
  registryId: string;
  activeVersionId: string;
  householdId: string;
}

export class PromptActivation {
  private constructor(private state: PromptActivationState) {}

  static create(input: CreatePromptActivationInput): PromptActivation {
    const id = crypto.randomUUID();
    const now = new Date();

    const state: PromptActivationState = {
      id,
      registryId: validateId(input.registryId, "registryId"),
      activeVersionId: validateId(input.activeVersionId, "activeVersionId"),
      householdId: validateId(input.householdId, "householdId"),
      activatedAt: now,
      deactivatedAt: null,
    };

    return new PromptActivation(state);
  }

  static fromState(state: PromptActivationState): PromptActivation {
    return new PromptActivation(state);
  }

  getState(): PromptActivationState {
    return { ...this.state };
  }

  get id(): string {
    return this.state.id;
  }

  get registryId(): string {
    return this.state.registryId;
  }

  get activeVersionId(): string {
    return this.state.activeVersionId;
  }

  get householdId(): string {
    return this.state.householdId;
  }

  get activatedAt(): Date {
    return this.state.activatedAt;
  }

  get deactivatedAt(): Date | null {
    return this.state.deactivatedAt;
  }

  isActive(): boolean {
    return this.state.deactivatedAt === null;
  }

  activate(versionId: string): void {
    if (this.isActive()) {
      throw new ValidationError("ACTIVATION_ALREADY_ACTIVE", "Activation is already active");
    }
    this.state.activeVersionId = validateId(versionId, "versionId");
    this.state.activatedAt = new Date();
    this.state.deactivatedAt = null;
  }

  deactivate(): void {
    if (!this.isActive()) {
      throw new ValidationError("ACTIVATION_ALREADY_INACTIVE", "Activation is already inactive");
    }
    this.state.deactivatedAt = new Date();
  }
}
