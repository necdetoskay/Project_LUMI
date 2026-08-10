import {
  index,
  jsonb,
  numeric,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { npcIntelligenceSchema } from "./schemas";
import { primaryId } from "./common";

export const npcSnapshots = npcIntelligenceSchema.table(
  "npc_snapshots",
  {
    id: primaryId(),
    npcId: uuid("npc_id").notNull(),
    householdId: uuid("household_id").notNull(),
    worldId: uuid("world_id").notNull(),
    childProfileId: uuid("child_profile_id").notNull(),
    characterId: uuid("character_id").notNull(),
    locationId: uuid("location_id"),
    needTypes: jsonb("need_types").$type<string[]>().notNull().default([]),
    relationshipToCharacter: numeric("relationship_to_character", {
      precision: 6,
      scale: 5,
    })
      .notNull()
      .default("0"),
    lastInteractionAt: timestamp("last_interaction_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("npc_snapshots_scope_idx").on(
      table.householdId,
      table.worldId,
      table.childProfileId,
      table.npcId,
    ),
    index("npc_snapshots_worker_idx").on(
      table.householdId,
      table.worldId,
      table.updatedAt,
      table.npcId,
    ),
  ],
);

export type NpcSnapshotRecord = typeof npcSnapshots.$inferSelect;
export type NewNpcSnapshotRecord = typeof npcSnapshots.$inferInsert;
