import type { LocationState, LocationAccessibilityStatus, OccupancyLevel, SafetyLevel } from "./world-types";
import { validateDisplayName, validateLocationKey } from "./validation";

export interface CreateLocationInput {
  worldId: string;
  regionId: string;
  locationKey: string;
  displayName: string;
  accessibilityStatus?: LocationAccessibilityStatus;
  locationType: string;
  occupancyLevel?: OccupancyLevel;
  safetyLevel?: SafetyLevel;
  isHome?: boolean;
}

export class Location {
  private constructor(private state: LocationState) {}

  static create(input: CreateLocationInput): Location {
    const id = crypto.randomUUID();
    const now = new Date();

    const state: LocationState = {
      id,
      worldId: input.worldId,
      regionId: input.regionId,
      locationKey: validateLocationKey(input.locationKey),
      displayName: validateDisplayName(input.displayName),
      accessibilityStatus: input.accessibilityStatus ?? "open",
      locationType: input.locationType as never,
      occupancyLevel: input.occupancyLevel ?? "empty",
      safetyLevel: input.safetyLevel ?? "safe",
      isHome: input.isHome ?? false,
      metadata: {},
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    return new Location(state);
  }

  static fromState(state: LocationState): Location {
    return new Location(state);
  }

  getState(): LocationState {
    return { ...this.state };
  }

  get id(): string {
    return this.state.id;
  }

  get worldId(): string {
    return this.state.worldId;
  }

  get regionId(): string {
    return this.state.regionId;
  }

  get version(): number {
    return this.state.version;
  }

  get isHome(): boolean {
    return this.state.isHome;
  }

  markAsHome(): void {
    this.state.isHome = true;
    this.state.updatedAt = new Date();
    this.state.version += 1;
  }

  setAccessibility(status: LocationAccessibilityStatus): void {
    this.state.accessibilityStatus = status;
    this.state.updatedAt = new Date();
    this.state.version += 1;
  }

  isAccessible(): boolean {
    return this.state.accessibilityStatus === "open";
  }
}
