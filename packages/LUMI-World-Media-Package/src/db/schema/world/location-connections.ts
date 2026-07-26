import {
  check,
  index,
  jsonb,
  primaryKey,
  real,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { worldSchema } from "../schemas";
import { locations } from "./locations";

export type LocationConnectionMetadata = {
  requirements?: string[];
  notes?: string;
};

export const locationConnections = worldSchema.table(
  "location_connections",
  {
    sourceLocationId: uuid("source_location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    targetLocationId: uuid("target_location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    connectionType: varchar("connection_type", {
      length: 60,
    }).notNull().default("path"),
    travelCost: real("travel_cost").notNull().default(1),
    metadata: jsonb("metadata")
      .$type<LocationConnectionMetadata>()
      .notNull()
      .default({}),
  },
  (table) => [
    primaryKey({
      columns: [
        table.sourceLocationId,
        table.targetLocationId,
      ],
      name: "location_connections_pk",
    }),
    index("location_connections_target_idx").on(
      table.targetLocationId,
    ),
    check(
      "location_connections_not_self_check",
      sql`${table.sourceLocationId} <> ${table.targetLocationId}`,
    ),
    check(
      "location_connections_travel_cost_check",
      sql`${table.travelCost} >= 0`,
    ),
  ],
);

export type LocationConnectionRecord =
  typeof locationConnections.$inferSelect;
export type NewLocationConnectionRecord =
  typeof locationConnections.$inferInsert;
