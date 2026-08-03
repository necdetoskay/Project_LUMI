import type {
  StoryVersionState,
  StoryVersionStatus,
  StoryMode,
} from "./story-types";
import { STORY_VERSION_STATUS } from "./story-types";
import { ValidationError } from "./errors";
import { validatePositive, validateTitle } from "./validation";
import type { StoryScene, StorySceneTransition } from "./story-scene";

export interface CreateStoryVersionInput {
  storyDefinitionId: string;
  versionNumber: number;
  schemaVersion: number;
  title: string;
  storyMode: StoryMode;
}

export class StoryVersion {
  private constructor(private state: StoryVersionState) {}

  static create(input: CreateStoryVersionInput): StoryVersion {
    const id = crypto.randomUUID();
    const now = new Date();

    const state: StoryVersionState = {
      id,
      storyDefinitionId: input.storyDefinitionId,
      versionNumber: validatePositive(input.versionNumber, "versionNumber"),
      publicationStatus: "draft",
      schemaVersion: validatePositive(input.schemaVersion, "schemaVersion"),
      title: validateTitle(input.title),
      summary: null,
      storyMode: input.storyMode,
      contentHash: null,
      createdAt: now,
      frozenAt: null,
      publishedAt: null,
      retiredAt: null,
    };

    return new StoryVersion(state);
  }

  static fromState(state: StoryVersionState): StoryVersion {
    return new StoryVersion(state);
  }

  getState(): StoryVersionState {
    return { ...this.state };
  }

  get id(): string {
    return this.state.id;
  }

  get storyDefinitionId(): string {
    return this.state.storyDefinitionId;
  }

  get versionNumber(): number {
    return this.state.versionNumber;
  }

  get publicationStatus(): StoryVersionStatus {
    return this.state.publicationStatus;
  }

  get contentHash(): string | null {
    return this.state.contentHash;
  }

  get storyMode(): StoryMode {
    return this.state.storyMode;
  }

  isPublished(): boolean {
    return this.state.publicationStatus === "published";
  }

  isFrozen(): boolean {
    return this.state.publicationStatus === "frozen";
  }

  assertMutable(): void {
    if (this.state.publicationStatus === "published" || this.state.publicationStatus === "retired") {
      throw new ValidationError(
        "PUBLISHED_VERSION_IMMUTABLE",
        "Published story versions are immutable; corrections require a new version",
      );
    }
  }

  freeze(contentHash: string): void {
    this.assertMutable();
    if (this.state.publicationStatus !== "draft") {
      throw new ValidationError("VERSION_ALREADY_FROZEN", "Version is not in draft state and cannot be frozen");
    }
    if (!contentHash || typeof contentHash !== "string") {
      throw new ValidationError("INVALID_CONTENT_HASH", "contentHash is required to freeze a version");
    }
    this.state.contentHash = contentHash;
    this.state.publicationStatus = "frozen";
    this.state.frozenAt = new Date();
  }

  publish(): void {
    if (this.state.publicationStatus !== "frozen") {
      throw new ValidationError(
        "VERSION_NOT_FROZEN",
        "Only a frozen version with a validated graph can be published",
      );
    }
    this.state.publicationStatus = "published";
    this.state.publishedAt = new Date();
  }

  retire(): void {
    if (this.state.publicationStatus !== "published") {
      throw new ValidationError("VERSION_NOT_PUBLISHED", "Only a published version can be retired");
    }
    this.state.publicationStatus = "retired";
    this.state.retiredAt = new Date();
  }

  validatesGraph(scenes: StoryScene[], transitions: StorySceneTransition[]): void {
    this.assertMutable();
    const entryScenes = scenes.filter((s) => s.isEntry);
    if (entryScenes.length !== 1) {
      throw new ValidationError(
        "INVALID_SCENE_GRAPH",
        "A story version must have exactly one entry scene",
      );
    }
    if (!scenes.some((s) => s.isTerminal)) {
      throw new ValidationError(
        "INVALID_SCENE_GRAPH",
        "A story version must have at least one terminal scene",
      );
    }
    const versionScenes = new Set(scenes.map((s) => s.storyVersionId));
    if (versionScenes.size !== 1 || !versionScenes.has(this.state.id)) {
      throw new ValidationError(
        "INVALID_SCENE_GRAPH",
        "All scenes must belong to the same story version",
      );
    }
    for (const t of transitions) {
      if (t.storyVersionId !== this.state.id) {
        throw new ValidationError(
          "INVALID_SCENE_GRAPH",
          "All transitions must belong to the same story version",
        );
      }
    }
  }
}

export const isValidStoryVersionStatus = (value: string): value is StoryVersionStatus =>
  (STORY_VERSION_STATUS as readonly string[]).includes(value);