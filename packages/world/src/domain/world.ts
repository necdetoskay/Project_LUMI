import type { WorldState, WorldLifecycleStatus } from "./world-types";
import { WORLD_LIFECYCLE_STATUSES } from "./world-types";
import { ValidationError } from "./errors";
import { validateSeed } from "./validation";

export interface CreateWorldInput {
  householdId: string;
  childProfileId: string;
  characterId: string;
  universeSeed: string;
  originSeed: string;
  acceptedCandidateSeed: string;
  generatorVersion: string;
  vectorVersion: string;
  originConcept: string;
}

export class World {
  private constructor(private state: WorldState) {}

  static create(input: CreateWorldInput): World {
    const id = crypto.randomUUID();
    const now = new Date();

    const state: WorldState = {
      id,
      householdId: input.householdId,
      childProfileId: input.childProfileId,
      characterId: input.characterId,
      universeSeed: validateSeed(input.universeSeed, "universeSeed"),
      originSeed: validateSeed(input.originSeed, "originSeed"),
      acceptedCandidateSeed: validateSeed(input.acceptedCandidateSeed, "acceptedCandidateSeed"),
      generatorVersion: validateSeed(input.generatorVersion, "generatorVersion"),
      vectorVersion: validateSeed(input.vectorVersion, "vectorVersion"),
      lifecycleStatus: "active",
      version: 1,
      metadata: { originConcept: input.originConcept },
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };

    return new World(state);
  }

  static fromState(state: WorldState): World {
    if (!(WORLD_LIFECYCLE_STATUSES as readonly string[]).includes(state.lifecycleStatus)) {
      throw new ValidationError("INVALID_WORLD_LIFECYCLE_STATUS", "Reconstituted world has invalid lifecycle status");
    }
    return new World(state);
  }

  getState(): WorldState {
    return { ...this.state };
  }

  get id(): string {
    return this.state.id;
  }

  get householdId(): string {
    return this.state.householdId;
  }

  get characterId(): string {
    return this.state.characterId;
  }

  get lifecycleStatus(): WorldLifecycleStatus {
    return this.state.lifecycleStatus;
  }

  get version(): number {
    return this.state.version;
  }

  isActive(): boolean {
    return this.state.lifecycleStatus === "active";
  }

  archive(): void {
    if (this.state.lifecycleStatus === "archived") {
      throw new ValidationError("WORLD_ALREADY_ARCHIVED", "World is already archived");
    }
    this.state.lifecycleStatus = "archived";
    this.state.archivedAt = new Date();
    this.state.updatedAt = new Date();
    this.state.version += 1;
  }

  toBootstrapManifest(originPackagePayload: Record<string, unknown>): {
    universeSeed: string;
    originSeed: string;
    acceptedCandidateSeed: string;
    generatorVersion: string;
    vectorVersion: string;
    originPackagePayload: Record<string, unknown>;
  } {
    return {
      universeSeed: this.state.universeSeed,
      originSeed: this.state.originSeed,
      acceptedCandidateSeed: this.state.acceptedCandidateSeed,
      generatorVersion: this.state.generatorVersion,
      vectorVersion: this.state.vectorVersion,
      originPackagePayload,
    };
  }
}
