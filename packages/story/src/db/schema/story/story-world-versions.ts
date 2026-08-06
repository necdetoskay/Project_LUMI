import { index, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "./common";
import { storySchema } from "./schemas";

/**
 * World versioning ledger: tracks the current version + state hash of a world
 * as story outcome commits are applied. One row per household+world.
 */
export const storyWorldVersions = storySchema.table(
  "story_world_versions",
  {
    id: primaryId(),
    householdId: uuid("household_id").notNull(),
    worldId: uuid("world_id").notNull(),
    /** Monotonic world version; bumped exactly once per committed manifest. */
    currentVersion: varchar("current_version", { length: 40 })
      .notNull()
      .default("1"),
    /** Deterministic hash of the world state at this version. */
    worldStateHash: varchar("world_state_hash", { length: 128 }).notNull(),
    lastManifestId: uuid("last_manifest_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("story_world_versions_scope_idx").on(
      table.householdId,
      table.worldId,
    ),
  ],
);

export type StoryWorldVersionRecord = typeof storyWorldVersions.$inferSelect;
export type NewStoryWorldVersionRecord = typeof storyWorldVersions.$inferInsert;
