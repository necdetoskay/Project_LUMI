import { relations } from "drizzle-orm";

import { assets } from "../media/assets";
import { biomes } from "./biomes";
import { locationConnections } from "./location-connections";
import { locations } from "./locations";
import { regions } from "./regions";
import { universes } from "./universes";
import { worldCalendars } from "./world-calendars";
import { worlds } from "./worlds";
import { worldStates } from "./world-states";

export const universesRelations = relations(
  universes,
  ({ many }) => ({
    worlds: many(worlds),
  }),
);

export const worldsRelations = relations(
  worlds,
  ({ one, many }) => ({
    universe: one(universes, {
      fields: [worlds.universeId],
      references: [universes.id],
    }),
    coverAsset: one(assets, {
      fields: [worlds.coverAssetId],
      references: [assets.id],
    }),
    regions: many(regions),
    states: many(worldStates),
    calendar: one(worldCalendars),
  }),
);

export const regionsRelations = relations(
  regions,
  ({ one, many }) => ({
    world: one(worlds, {
      fields: [regions.worldId],
      references: [worlds.id],
    }),
    biome: one(biomes, {
      fields: [regions.biomeId],
      references: [biomes.id],
    }),
    locations: many(locations),
  }),
);

export const locationsRelations = relations(
  locations,
  ({ one, many }) => ({
    region: one(regions, {
      fields: [locations.regionId],
      references: [regions.id],
    }),
    outgoingConnections: many(locationConnections, {
      relationName: "location_source",
    }),
    incomingConnections: many(locationConnections, {
      relationName: "location_target",
    }),
  }),
);
