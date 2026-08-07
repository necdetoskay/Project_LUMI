import {
  validateDisplayName,
  validateTemplateKey,
  validateObjectiveKey,
  validateReward,
} from "./validation";
import { ValidationError } from "./errors";
import type {
  QuestTemplateState,
  QuestTemplateObjectiveState,
  QuestRewardState,
} from "./world-types";

export interface CreateQuestTemplateObjectiveInput {
  objectiveKey: string;
  title: string;
}

export interface CreateQuestTemplateRewardInput {
  itemDefinitionKey: string;
  quantity: number;
}

export interface CreateQuestTemplateInput {
  templateKey: string;
  displayName: string;
  description: string;
  objectives: CreateQuestTemplateObjectiveInput[];
  reward?: CreateQuestTemplateRewardInput | null;
}

/**
 * A QuestTemplate is an authored, design-time quest *definition*. It is
 * additive-only (created + read; not updated/deleted in scope) and is not
 * household/world-scoped at definition time. Runtime state/status lives in
 * the S28 `Quest` aggregate; a template only declares structure.
 */
export class QuestTemplate {
  private constructor(private state: QuestTemplateState) {}

  static create(input: CreateQuestTemplateInput): QuestTemplate {
    if (input.objectives.length === 0) {
      throw new ValidationError(
        "QUEST_TEMPLATE_NO_OBJECTIVES",
        "A quest template must have at least one objective",
        "objectives",
      );
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const objectives: QuestTemplateObjectiveState[] = input.objectives.map(
      (o, index): QuestTemplateObjectiveState => ({
        index,
        objectiveKey: validateObjectiveKey(o.objectiveKey),
        title: validateDisplayName(o.title, "objectiveTitle"),
      }),
    );

    const state: QuestTemplateState = {
      id,
      templateKey: validateTemplateKey(input.templateKey),
      displayName: validateDisplayName(input.displayName),
      description: input.description.trim(),
      objectives,
      reward: input.reward ? validateReward(input.reward) : null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    return new QuestTemplate(state);
  }

  static fromState(state: QuestTemplateState): QuestTemplate {
    const template = new QuestTemplate(state);
    template.validateState();
    return template;
  }

  private validateState(): void {
    validateTemplateKey(this.state.templateKey);
    for (const o of this.state.objectives) {
      validateObjectiveKey(o.objectiveKey);
      validateDisplayName(o.title, "objectiveTitle");
    }
    if (this.state.reward) {
      validateReward(this.state.reward);
    }
  }

  getState(): QuestTemplateState {
    return {
      ...this.state,
      objectives: this.state.objectives.map((o) => ({ ...o })),
    };
  }

  get id(): string {
    return this.state.id;
  }

  get templateKey(): string {
    return this.state.templateKey;
  }

  get displayName(): string {
    return this.state.displayName;
  }

  get description(): string {
    return this.state.description;
  }

  get objectives(): QuestTemplateObjectiveState[] {
    return this.state.objectives.map((o) => ({ ...o }));
  }

  get reward(): QuestRewardState | null {
    return this.state.reward ? { ...this.state.reward } : null;
  }

  get version(): number {
    return this.state.version;
  }
}
