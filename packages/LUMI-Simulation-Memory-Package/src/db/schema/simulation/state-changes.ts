import { index, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { simulationSchema } from "../schemas";
import { simulationEvents } from "./simulation-events";

export const stateChanges = simulationSchema.table(
  "state_changes",
  {
    id: primaryId(),
    simulationEventId: uuid("simulation_event_id").notNull().references(() => simulationEvents.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    path: varchar("path", { length: 240 }).notNull(),
    previousValue: jsonb("previous_value").$type<unknown>(),
    nextValue: jsonb("next_value").$type<unknown>(),
    changedAt: timestamp("changed_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("state_changes_entity_idx").on(table.entityType, table.entityId),
    index("state_changes_event_idx").on(table.simulationEventId),
  ],
);
