import type {
  StoryDefinitionState,
  StoryDefinitionLifecycle,
  StoryType,
  StorySourceType,
} from "./story-types";
import { assertKnownLifecycle } from "./story-types";
import { ValidationError } from "./errors";
import { validateId, validateSlug, validateTitle } from "./validation";

export interface CreateStoryDefinitionInput {
  householdId: string;
  childProfileId?: string | undefined;
  title: string;
  slug: string;
  storyType: StoryType;
  sourceType: StorySourceType;
  ageGroup: string;
  defaultLanguage: string;
}

export class StoryDefinition {
  private constructor(private state: StoryDefinitionState) {}

  static create(input: CreateStoryDefinitionInput): StoryDefinition {
    const id = crypto.randomUUID();
    const now = new Date();

    const state: StoryDefinitionState = {
      id,
      householdId: validateId(input.householdId, "householdId"),
      childProfileId: input.childProfileId ?? null,
      title: validateTitle(input.title),
      slug: validateSlug(input.slug),
      storyType: input.storyType,
      sourceType: input.sourceType,
      lifecycle: "draft",
      currentPublishedVersionId: null,
      ageGroup: input.ageGroup,
      defaultLanguage: input.defaultLanguage,
      version: 1,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };

    return new StoryDefinition(state);
  }

  static fromState(state: StoryDefinitionState): StoryDefinition {
    assertKnownLifecycle(state.lifecycle);
    return new StoryDefinition(state);
  }

  getState(): StoryDefinitionState {
    return { ...this.state };
  }

  get id(): string {
    return this.state.id;
  }

  get householdId(): string {
    return this.state.householdId;
  }

  get childProfileId(): string | null {
    return this.state.childProfileId;
  }

  get lifecycle(): StoryDefinitionLifecycle {
    return this.state.lifecycle;
  }

  get version(): number {
    return this.state.version;
  }

  get currentPublishedVersionId(): string | null {
    return this.state.currentPublishedVersionId;
  }

  setCurrentPublishedVersion(versionId: string): void {
    if (this.state.lifecycle === "archived") {
      throw new ValidationError(
        "STORY_ARCHIVED",
        "Cannot publish to an archived story definition",
      );
    }
    this.state.currentPublishedVersionId = versionId;
    this.state.lifecycle = "published";
    this.state.updatedAt = new Date();
    this.state.version += 1;
  }

  retire(): void {
    if (this.state.lifecycle === "archived") {
      throw new ValidationError(
        "STORY_ALREADY_ARCHIVED",
        "Story definition is already archived",
      );
    }
    this.state.lifecycle = "retired";
    this.state.updatedAt = new Date();
    this.state.version += 1;
  }

  archive(): void {
    if (this.state.lifecycle === "archived") {
      throw new ValidationError(
        "STORY_ALREADY_ARCHIVED",
        "Story definition is already archived",
      );
    }
    this.state.lifecycle = "archived";
    this.state.archivedAt = new Date();
    this.state.updatedAt = new Date();
    this.state.version += 1;
  }

  isActive(): boolean {
    return (
      this.state.lifecycle === "published" || this.state.lifecycle === "retired"
    );
  }
}
