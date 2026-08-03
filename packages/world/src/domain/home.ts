import type { HomeState, HomeType, ResidenceType } from "./world-types";
import { validateDisplayName } from "./validation";

export interface CreateHomeInput {
  worldId: string;
  locationId: string;
  homeType: HomeType;
  displayName: string;
  residenceType?: ResidenceType;
}

export class Home {
  private constructor(private state: HomeState) {}

  static create(input: CreateHomeInput): Home {
    const id = crypto.randomUUID();
    const now = new Date();

    const state: HomeState = {
      id,
      worldId: input.worldId,
      locationId: input.locationId,
      homeType: input.homeType,
      displayName: validateDisplayName(input.displayName),
      residenceType: input.residenceType ?? "primary",
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    return new Home(state);
  }

  static fromState(state: HomeState): Home {
    return new Home(state);
  }

  getState(): HomeState {
    return { ...this.state };
  }

  get id(): string {
    return this.state.id;
  }

  get worldId(): string {
    return this.state.worldId;
  }

  get locationId(): string {
    return this.state.locationId;
  }

  get version(): number {
    return this.state.version;
  }
}
