import {
  index,
  integer,
  jsonb,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { profileSchema } from "./schemas";
import { primaryId } from "./common";

export const worldEnvironmentSnapshots = profileSchema.table(
  "world_environment_snapshots",
  {
    id: primaryId(),
    worldId: uuid("world_id").notNull(),
    regionId: uuid("region_id").notNull(),
    snapshotType: varchar("snapshot_type", { length: 30 })
      .notNull()
      .default("periodic"),
    environmentVector: jsonb("environment_vector").notNull().default({}),
    anomalyLevel: varchar("anomaly_level", { length: 20 })
      .notNull()
      .default("stable"),
    snapshotMetadata: jsonb("snapshot_metadata").default({}),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("wesnap_world_region_idx").on(
      table.worldId,
      table.regionId,
      table.createdAt,
    ),
  ],
);

export type WorldEnvironmentSnapshotRecord =
  typeof worldEnvironmentSnapshots.$inferSelect;
export type NewWorldEnvironmentSnapshotRecord =
  typeof worldEnvironmentSnapshots.$inferInsert;
