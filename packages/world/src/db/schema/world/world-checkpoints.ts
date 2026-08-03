import { index, integer, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "./common";
import { profileSchema } from "./schemas";

export const worldCheckpoints = profileSchema.table(
  "world_checkpoints",
  {
    id: primaryId(),
    worldId: uuid("world_id").notNull(),
    checkpointSequence: integer("checkpoint_sequence").notNull(),
    worldVersion: integer("world_version").notNull(),
    stateHash: varchar("state_hash", { length: 96 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_world_checkpoint_seq").on(table.worldId, table.checkpointSequence),
    index("wc_world_idx").on(table.worldId, table.checkpointSequence),
  ],
);

export type WorldCheckpointRecord = typeof worldCheckpoints.$inferSelect;
export type NewWorldCheckpointRecord = typeof worldCheckpoints.$inferInsert;
