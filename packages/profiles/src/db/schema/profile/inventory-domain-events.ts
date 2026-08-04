import { jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "../common";
import { profileSchema } from "../schemas";
import { inventoryItemInstances } from "./inventory-item-instances";

export const inventoryDomainEvents = profileSchema.table(
  "inventory_domain_events",
  {
    id: primaryId(),
    itemInstanceId: uuid("item_instance_id")
      .notNull()
      .references(() => inventoryItemInstances.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    actorHouseholdId: uuid("actor_household_id").notNull(),
    actorUserId: uuid("actor_user_id"),
    payload: jsonb("payload").notNull().default({}),
    idempotencyKey: varchar("idempotency_key", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  () => ({
    itemIdx: sql`CREATE INDEX IF NOT EXISTS inv_events_item_idx ON ${profileSchema}.inventory_domain_events (item_instance_id, created_at DESC)`,
    typeIdx: sql`CREATE INDEX IF NOT EXISTS inv_events_type_idx ON ${profileSchema}.inventory_domain_events (event_type, created_at DESC)`,
  }),
);

export type InventoryDomainEventRecord =
  typeof inventoryDomainEvents.$inferSelect;
export type NewInventoryDomainEventRecord =
  typeof inventoryDomainEvents.$inferInsert;
