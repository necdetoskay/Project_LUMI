import type {
  WorldLifecycleStatus,
  RegionAccessibilityStatus,
  DiscoveryStatus,
  LocationAccessibilityStatus,
  OccupancyLevel,
  SafetyLevel,
  HomeType,
  ResidenceType,
  RegionType,
  LocationType,
  MoveType,
} from "./world-types";
import {
  WORLD_LIFECYCLE_STATUSES,
  REGION_ACCESSIBILITY_STATUSES,
  DISCOVERY_STATUSES,
  LOCATION_ACCESSIBILITY_STATUSES,
  OCCUPANCY_LEVELS,
  SAFETY_LEVELS,
  HOME_TYPES,
  RESIDENCE_TYPES,
  REGION_TYPES,
  LOCATION_TYPES,
  MOVE_TYPES,
} from "./world-types";
import { ValidationError } from "./errors";

export function validateWorldLifecycleStatus(
  value: string,
): WorldLifecycleStatus {
  if (!(WORLD_LIFECYCLE_STATUSES as readonly string[]).includes(value)) {
    throw new ValidationError(
      "INVALID_WORLD_LIFECYCLE_STATUS",
      `Invalid world lifecycle status: ${value}`,
      "lifecycleStatus",
    );
  }
  return value as WorldLifecycleStatus;
}

export function validateRegionAccessibilityStatus(
  value: string,
): RegionAccessibilityStatus {
  if (!(REGION_ACCESSIBILITY_STATUSES as readonly string[]).includes(value)) {
    throw new ValidationError(
      "INVALID_REGION_ACCESSIBILITY",
      `Invalid region accessibility: ${value}`,
      "accessibilityStatus",
    );
  }
  return value as RegionAccessibilityStatus;
}

export function validateDiscoveryStatus(value: string): DiscoveryStatus {
  if (!(DISCOVERY_STATUSES as readonly string[]).includes(value)) {
    throw new ValidationError(
      "INVALID_DISCOVERY_STATUS",
      `Invalid discovery status: ${value}`,
      "discoveryStatus",
    );
  }
  return value as DiscoveryStatus;
}

export function validateLocationAccessibilityStatus(
  value: string,
): LocationAccessibilityStatus {
  if (!(LOCATION_ACCESSIBILITY_STATUSES as readonly string[]).includes(value)) {
    throw new ValidationError(
      "INVALID_LOCATION_ACCESSIBILITY",
      `Invalid location accessibility: ${value}`,
      "accessibilityStatus",
    );
  }
  return value as LocationAccessibilityStatus;
}

export function validateOccupancyLevel(value: string): OccupancyLevel {
  if (!(OCCUPANCY_LEVELS as readonly string[]).includes(value)) {
    throw new ValidationError(
      "INVALID_OCCUPANCY_LEVEL",
      `Invalid occupancy level: ${value}`,
      "occupancyLevel",
    );
  }
  return value as OccupancyLevel;
}

export function validateSafetyLevel(value: string): SafetyLevel {
  if (!(SAFETY_LEVELS as readonly string[]).includes(value)) {
    throw new ValidationError(
      "INVALID_SAFETY_LEVEL",
      `Invalid safety level: ${value}`,
      "safetyLevel",
    );
  }
  return value as SafetyLevel;
}

export function validateHomeType(value: string): HomeType {
  if (!(HOME_TYPES as readonly string[]).includes(value)) {
    throw new ValidationError(
      "INVALID_HOME_TYPE",
      `Invalid home type: ${value}`,
      "homeType",
    );
  }
  return value as HomeType;
}

export function validateResidenceType(value: string): ResidenceType {
  if (!(RESIDENCE_TYPES as readonly string[]).includes(value)) {
    throw new ValidationError(
      "INVALID_RESIDENCE_TYPE",
      `Invalid residence type: ${value}`,
      "residenceType",
    );
  }
  return value as ResidenceType;
}

export function validateRegionType(value: string): RegionType {
  if (!(REGION_TYPES as readonly string[]).includes(value)) {
    throw new ValidationError(
      "INVALID_REGION_TYPE",
      `Invalid region type: ${value}`,
      "regionType",
    );
  }
  return value as RegionType;
}

export function validateLocationType(value: string): LocationType {
  if (!(LOCATION_TYPES as readonly string[]).includes(value)) {
    throw new ValidationError(
      "INVALID_LOCATION_TYPE",
      `Invalid location type: ${value}`,
      "locationType",
    );
  }
  return value as LocationType;
}

export function validateMoveType(value: string): MoveType {
  if (!(MOVE_TYPES as readonly string[]).includes(value)) {
    throw new ValidationError(
      "INVALID_MOVE_TYPE",
      `Invalid move type: ${value}`,
      "moveType",
    );
  }
  return value as MoveType;
}

export function validateDisplayName(
  value: string,
  field = "displayName",
): string {
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 200) {
    throw new ValidationError(
      "INVALID_DISPLAY_NAME",
      "Display name must be 1-200 characters",
      field,
    );
  }
  return trimmed;
}

export function validateSeed(value: string, field = "seed"): string {
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 120) {
    throw new ValidationError(
      "INVALID_SEED",
      `Seed must be 1-120 characters`,
      field,
    );
  }
  return trimmed;
}

export function validateLocationKey(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length < 1 ||
    trimmed.length > 120 ||
    !/^[a-z0-9_-]+$/.test(trimmed)
  ) {
    throw new ValidationError(
      "INVALID_LOCATION_KEY",
      "Location key must be 1-120 lowercase alphanumeric chars",
      "locationKey",
    );
  }
  return trimmed;
}

export function validateRegionKey(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length < 1 ||
    trimmed.length > 120 ||
    !/^[a-z0-9_-]+$/.test(trimmed)
  ) {
    throw new ValidationError(
      "INVALID_REGION_KEY",
      "Region key must be 1-120 lowercase alphanumeric chars",
      "regionKey",
    );
  }
  return trimmed;
}
