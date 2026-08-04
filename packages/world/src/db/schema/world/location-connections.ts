import {
  boolean,
  index,
  integer,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { profileSchema } from "./schemas";
import { primaryId } from "./common";

export const worldLocationConnections = profileSchema.table(
  "world_location_connections",
  {
    id: primaryId(),
    worldId: uuid("world_id").notNull(),
    fromLocationId: uuid("from_location_id").notNull(),
    toLocationId: uuid("to_location_id").notNull(),
    connectionType: varchar("connection_type", { length: 30 })
      .notNull()
      .default("path"),
    traversalCost: integer("traversal_cost").notNull().default(1),
    isBidirectional: boolean("is_bidirectional").notNull().default(true),
    accessibilityRequirement: varchar("accessibility_requirement", {
      length: 20,
    }),
    description: text("description"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_location_connection").on(
      table.fromLocationId,
      table.toLocationId,
    ),
    index("wlc_world_idx").on(table.worldId),
    index("wlc_from_idx").on(table.fromLocationId),
    index("wlc_to_idx").on(table.toLocationId),
  ],
);

export type WorldLocationConnectionRecord =
  typeof worldLocationConnections.$inferSelect;
export type NewWorldLocationConnectionRecord =
  typeof worldLocationConnections.$inferInsert;
