import { relations } from "drizzle-orm";
import { worlds } from "./worlds";
import { worldRegions } from "./regions";
import { worldLocations } from "./locations";
import { worldHomes } from "./homes";
import { worldBootstrapManifests } from "./world-bootstrap-manifests";
import { worldCheckpoints } from "./world-checkpoints";
import { worldCharacterLocations } from "./character-locations";
import { worldCharacterMovementEvents } from "./character-movement-events";
import { worldEnvironmentSnapshots } from "./environment-snapshots";
import { worldLocationConnections } from "./location-connections";
import { worldCharacterResidences } from "./world-character-residences";

export const worldsRelations = relations(worlds, ({ many }) => ({
  regions: many(worldRegions),
  locations: many(worldLocations),
  homes: many(worldHomes),
  bootstrapManifest: many(worldBootstrapManifests),
  checkpoints: many(worldCheckpoints),
  characterLocations: many(worldCharacterLocations),
  movementEvents: many(worldCharacterMovementEvents),
  environmentSnapshots: many(worldEnvironmentSnapshots),
  locationConnections: many(worldLocationConnections),
  residences: many(worldCharacterResidences),
}));

export const worldRegionsRelations = relations(worldRegions, () => ({}));
export const worldLocationsRelations = relations(worldLocations, () => ({}));
export const worldHomesRelations = relations(worldHomes, () => ({}));
export const worldBootstrapManifestsRelations = relations(
  worldBootstrapManifests,
  () => ({}),
);
export const worldCheckpointsRelations = relations(
  worldCheckpoints,
  () => ({}),
);
export const worldCharacterLocationsRelations = relations(
  worldCharacterLocations,
  () => ({}),
);
export const worldCharacterMovementEventsRelations = relations(
  worldCharacterMovementEvents,
  () => ({}),
);
export const worldEnvironmentSnapshotsRelations = relations(
  worldEnvironmentSnapshots,
  () => ({}),
);
export const worldLocationConnectionsRelations = relations(
  worldLocationConnections,
  () => ({}),
);
export const worldCharacterResidencesRelations = relations(
  worldCharacterResidences,
  () => ({}),
);
