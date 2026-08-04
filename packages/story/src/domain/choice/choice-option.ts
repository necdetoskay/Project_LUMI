import { ValidationError } from "../errors";
import type {
  ChoiceAvailabilityRule,
  ChoiceConsequencePreview,
} from "./choice-types";

export interface CreateChoiceOptionInput {
  choicePointId: string;
  optionKey: string;
  optionText: string;
  sequenceNumber?: number | undefined;
  availabilityRule?: ChoiceAvailabilityRule | undefined;
  consequencePreviews?: ChoiceConsequencePreview[] | undefined;
}

export interface ChoiceOptionState {
  id: string;
  choicePointId: string;
  optionKey: string;
  optionText: string;
  sequenceNumber: number;
  availabilityRule: ChoiceAvailabilityRule | null;
  consequencePreviews: ChoiceConsequencePreview[];
  createdAt: Date;
}

export class ChoiceOption {
  private constructor(private readonly state: ChoiceOptionState) {}

  static create(input: CreateChoiceOptionInput): ChoiceOption {
    return new ChoiceOption({
      id: crypto.randomUUID(),
      choicePointId: input.choicePointId,
      optionKey: validateOptionKey(input.optionKey),
      optionText: validateOptionText(input.optionText),
      sequenceNumber: input.sequenceNumber ?? 0,
      availabilityRule: input.availabilityRule ?? null,
      consequencePreviews: input.consequencePreviews ?? [],
      createdAt: new Date(),
    });
  }

  static fromState(state: ChoiceOptionState): ChoiceOption {
    return new ChoiceOption(state);
  }

  get id(): string {
    return this.state.id;
  }

  get choicePointId(): string {
    return this.state.choicePointId;
  }

  get availabilityRule(): ChoiceAvailabilityRule | null {
    return this.state.availabilityRule;
  }

  get consequencePreviews(): ChoiceConsequencePreview[] {
    return [...this.state.consequencePreviews];
  }

  getState(): ChoiceOptionState {
    return {
      ...this.state,
      consequencePreviews: [...this.state.consequencePreviews],
    };
  }
}

function validateOptionKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed || trimmed.length > 120) {
    throw new ValidationError(
      "INVALID_CHOICE_OPTION_KEY",
      "Choice option key must be 1-120 characters",
    );
  }
  return trimmed;
}

function validateOptionText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 1000) {
    throw new ValidationError(
      "INVALID_CHOICE_OPTION_TEXT",
      "Choice option text must be 1-1000 characters",
    );
  }
  return trimmed;
}
