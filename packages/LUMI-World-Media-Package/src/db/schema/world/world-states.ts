import {
  index,
  jsonb,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { primaryId } from "../common";
import { worldSchema } from "../schemas";
import { worlds } from "./worlds";

export type WorldStatePayload = {
  weather?: string;
  daylight?: number;
  season?: string;
  activeEventIds?: string[];
  simulationCursor?: string;
};

export const worldStates = worldSchema.table(
  "world_states",
  {
    id: primaryId(),
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    effectiveAt: timestamp("effective_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    payload: jsonb("payload")
      .$type<WorldStatePayload>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull().defaultNow(),
  },
  (table) => [
    index("world_states_world_effective_idx").on(
      table.worldId,
      table.effectiveAt,
    ),
  ],
);

export type WorldStateRecord = typeof worldStates.$inferSelect;
export type NewWorldStateRecord = typeof worldStates.$inferInsert;
