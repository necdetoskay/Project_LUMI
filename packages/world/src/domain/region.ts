import type { RegionState, RegionType, RegionAccessibilityStatus, DiscoveryStatus } from "./world-types";
import { validateDisplayName, validateRegionKey } from "./validation";

export interface CreateRegionInput {
  worldId: string;
  regionKey: string;
  displayName: string;
  regionType: RegionType;
  accessibilityStatus?: RegionAccessibilityStatus;
  discoveryStatus?: DiscoveryStatus;
  subregionOf?: string | null;
  sortOrder?: number;
}

export class Region {
  private constructor(private state: RegionState) {}

  static create(input: CreateRegionInput): Region {
    const id = crypto.randomUUID();
    const now = new Date();

    const state: RegionState = {
      id,
      worldId: input.worldId,
      regionKey: validateRegionKey(input.regionKey),
      displayName: validateDisplayName(input.displayName),
      regionType: input.regionType,
      accessibilityStatus: input.accessibilityStatus ?? "open",
      discoveryStatus: input.discoveryStatus ?? "discovered",
      environmentVector: {},
      subregionOf: input.subregionOf ?? null,
      sortOrder: input.sortOrder ?? 0,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    return new Region(state);
  }

  static fromState(state: RegionState): Region {
    return new Region(state);
  }

  getState(): RegionState {
    return { ...this.state };
  }

  get id(): string {
    return this.state.id;
  }

  get worldId(): string {
    return this.state.worldId;
  }

  get version(): number {
    return this.state.version;
  }

  setAccessibility(status: RegionAccessibilityStatus): void {
    this.state.accessibilityStatus = status;
    this.state.updatedAt = new Date();
    this.state.version += 1;
  }

  setDiscoveryStatus(status: DiscoveryStatus): void {
    this.state.discoveryStatus = status;
    this.state.updatedAt = new Date();
    this.state.version += 1;
  }

  isAccessible(): boolean {
    return this.state.accessibilityStatus === "open";
  }
}
