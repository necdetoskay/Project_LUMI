import type {
  PromptVariableDefinition,
  PromptVersionState,
} from "./prompt-types";
import { PROMPT_VERSION_STATUS } from "./prompt-types";
import { ValidationError } from "./errors";
import {
  validateId,
  validateTemplateBody,
  validateVersionNumber,
} from "./validation";

export interface CreatePromptVersionInput {
  registryId: string;
  versionNumber: number;
  templateBody: string;
  variableSchema?: PromptVariableDefinition[] | undefined;
  modelPreferences?: Record<string, unknown> | undefined;
  outputSchema?: Record<string, unknown> | undefined;
}

export class PromptVersion {
  private constructor(private state: PromptVersionState) {}

  static create(input: CreatePromptVersionInput): PromptVersion {
    const id = crypto.randomUUID();
    const now = new Date();

    const state: PromptVersionState = {
      id,
      registryId: validateId(input.registryId, "registryId"),
      versionNumber: validateVersionNumber(input.versionNumber),
      status: "draft",
      templateBody: validateTemplateBody(input.templateBody),
      variableSchema: input.variableSchema ?? [],
      modelPreferences: input.modelPreferences ?? {},
      outputSchema: input.outputSchema ?? {},
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      archivedAt: null,
    };

    return new PromptVersion(state);
  }

  static fromState(state: PromptVersionState): PromptVersion {
    return new PromptVersion(state);
  }

  getState(): PromptVersionState {
    return { ...this.state };
  }

  get id(): string {
    return this.state.id;
  }

  get registryId(): string {
    return this.state.registryId;
  }

  get versionNumber(): number {
    return this.state.versionNumber;
  }

  get status(): (typeof PROMPT_VERSION_STATUS)[number] {
    return this.state.status;
  }

  get templateBody(): string {
    return this.state.templateBody;
  }

  get variableSchema(): PromptVariableDefinition[] {
    return this.state.variableSchema;
  }

  get modelPreferences(): Record<string, unknown> {
    return this.state.modelPreferences;
  }

  get outputSchema(): Record<string, unknown> {
    return this.state.outputSchema;
  }

  get publishedAt(): Date | null {
    return this.state.publishedAt;
  }

  get archivedAt(): Date | null {
    return this.state.archivedAt;
  }

  isPublished(): boolean {
    return this.state.status === "published";
  }

  isArchived(): boolean {
    return this.state.status === "archived";
  }

  assertMutable(): void {
    if (this.state.status === "published" || this.state.status === "archived") {
      throw new ValidationError(
        "PUBLISHED_VERSION_IMMUTABLE",
        "Published prompt versions are immutable; corrections require a new version",
      );
    }
  }

  assertRenderable(): void {
    if (this.state.status !== "published") {
      throw new ValidationError(
        "VERSION_NOT_PUBLISHED",
        "Only published versions can be rendered",
      );
    }
  }

  publish(): void {
    if (this.state.status !== "draft") {
      throw new ValidationError(
        "VERSION_NOT_DRAFT",
        "Only a draft version can be published",
      );
    }
    this.state.status = "published";
    this.state.publishedAt = new Date();
    this.state.updatedAt = new Date();
  }

  archive(): void {
    if (this.state.status !== "published") {
      throw new ValidationError(
        "VERSION_NOT_PUBLISHED",
        "Only a published version can be archived",
      );
    }
    this.state.status = "archived";
    this.state.archivedAt = new Date();
    this.state.updatedAt = new Date();
  }
}

export const isValidPromptVersionStatus = (
  value: string,
): value is (typeof PROMPT_VERSION_STATUS)[number] =>
  (PROMPT_VERSION_STATUS as readonly string[]).includes(value);
