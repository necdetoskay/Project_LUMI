import { jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "./common";
import { profileSchema } from "./schemas";

export const worldBootstrapManifests = profileSchema.table(
  "world_bootstrap_manifests",
  {
    id: primaryId(),
    worldId: uuid("world_id").notNull().unique(),
    universeSeed: varchar("universe_seed", { length: 120 }).notNull(),
    originSeed: varchar("origin_seed", { length: 120 }).notNull(),
    acceptedCandidateSeed: varchar("accepted_candidate_seed", {
      length: 120,
    }).notNull(),
    generatorVersion: varchar("generator_version", { length: 40 }).notNull(),
    vectorVersion: varchar("vector_version", { length: 40 }).notNull(),
    originPackagePayload: jsonb("origin_package_payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
);

export type WorldBootstrapManifestRecord =
  typeof worldBootstrapManifests.$inferSelect;
export type NewWorldBootstrapManifestRecord =
  typeof worldBootstrapManifests.$inferInsert;
