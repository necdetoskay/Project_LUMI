import { check, index, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "./common";
import { profileSchema } from "./schemas";

export const worldCharacterMovementEvents = profileSchema.table(
  "world_character_movement_events",
  {
    id: primaryId(),
    characterId: uuid("character_id").notNull(),
    worldId: uuid("world_id").notNull(),
    fromLocationId: uuid("from_location_id"),
    toLocationId: uuid("to_location_id").notNull(),
    moveType: varchar("move_type", { length: 20 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("wcme_character_idx").on(table.characterId, table.createdAt),
    index("wcme_world_idx").on(table.worldId),
    check(
      "wcme_move_type_check",
      sql`${table.moveType} IN ('arrival', 'movement', 'return_home')`,
    ),
  ],
);

export type WorldCharacterMovementEventRecord =
  typeof worldCharacterMovementEvents.$inferSelect;
export type NewWorldCharacterMovementEventRecord =
  typeof worldCharacterMovementEvents.$inferInsert;
