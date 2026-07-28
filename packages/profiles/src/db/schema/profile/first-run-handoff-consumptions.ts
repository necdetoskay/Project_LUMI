import { index, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { primaryId, timestampColumns } from "../common";
import { profileSchema } from "../schemas";
import { childProfiles } from "./child-profiles";
import { firstRunHandoffs } from "./first-run-handoffs";
import { households } from "./households";
import { lumiCharacters } from "./lumi-characters";

export const firstRunHandoffConsumptions = profileSchema.table(
  "first_run_handoff_consumptions",
  {
    id: primaryId(),
    handoffId: uuid("handoff_id")
      .notNull()
      .references(() => firstRunHandoffs.id, { onDelete: "cascade" }),
    childProfileId: uuid("child_profile_id")
      .notNull()
      .references(() => childProfiles.id, { onDelete: "cascade" }),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    characterId: uuid("character_id")
      .notNull()
      .unique()
      .references(() => lumiCharacters.id, { onDelete: "cascade" }),
    consumedByUserId: uuid("consumed_by_user_id").notNull(),
    originModeAtConsume: varchar("origin_mode_at_consume", {
      length: 20,
    }).notNull(),
    note: varchar("note", { length: 500 }),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("first_run_handoff_consumptions_handoff_unique").on(
      table.handoffId,
    ),
    index("first_run_handoff_consumptions_profile_idx").on(
      table.childProfileId,
    ),
    index("first_run_handoff_consumptions_household_idx").on(
      table.householdId,
    ),
  ],
);

export type FirstRunHandoffConsumptionRecord =
  typeof firstRunHandoffConsumptions.$inferSelect;
export type NewFirstRunHandoffConsumptionRecord =
  typeof firstRunHandoffConsumptions.$inferInsert;
