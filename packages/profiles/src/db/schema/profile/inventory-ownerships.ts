import { jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "../common";
import { profileSchema } from "../schemas";
import { inventoryItemInstances } from "./inventory-item-instances";

export const inventoryOwnerships = profileSchema.table(
  "inventory_ownerships",
  {
    id: primaryId(),
    itemInstanceId: uuid("item_instance_id")
      .notNull()
      .references(() => inventoryItemInstances.id, { onDelete: "restrict" }),
    ownerType: varchar("owner_type", { length: 40 }).notNull(),
    ownerId: uuid("owner_id").notNull(),
    ownershipType: varchar("ownership_type", { length: 20 }).notNull().default("owned"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    sourceType: varchar("source_type", { length: 40 }).notNull(),
    sourceId: uuid("source_id"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    releasedAt: timestamp("released_at", { withTimezone: true, mode: "date" }),
  },
  () => ({
    activeUnique: sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_inv_ownership_active ON ${profileSchema}.inventory_ownerships (item_instance_id) WHERE status = 'active'`,
    ownerIdx: sql`CREATE INDEX IF NOT EXISTS inv_ownership_owner_idx ON ${profileSchema}.inventory_ownerships (owner_type, owner_id, status)`,
    sourceIdx: sql`CREATE INDEX IF NOT EXISTS inv_ownership_source_idx ON ${profileSchema}.inventory_ownerships (source_type, source_id)`,
  }),
);

export type InventoryOwnershipRecord = typeof inventoryOwnerships.$inferSelect;
export type NewInventoryOwnershipRecord = typeof inventoryOwnerships.$inferInsert;

