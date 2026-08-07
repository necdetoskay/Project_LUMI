import { index, timestamp, uuid, varchar, jsonb, integer } from "drizzle-orm/pg-core";
import { primaryId } from "./common";
import { storySchema } from "./schemas";

export const storyHooks = storySchema.table(
  "story_hooks",
  {
    id: primaryId(),
    householdId: uuid("household_id").notNull(),
    childProfileId: uuid("child_profile_id").notNull(),
    storySessionId: uuid("story_session_id").notNull(),
    worldId: uuid("world_id").notNull(),
    opportunityId: varchar("opportunity_id", { length: 255 }).notNull(),
    hookType: varchar("hook_type", { length: 40 }).notNull(),
    sourceNpcId: uuid("source_npc_id").notNull(),
    targetNpcId: uuid("target_npc_id"),
    payload: jsonb("payload").notNull().default({}),
    constraints: jsonb("constraints").notNull().default({}),
    sceneType: varchar("scene_type", { length: 30 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    consumedAt: timestamp("consumed_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [
    index("story_hook_opportunity_idx").on(table.opportunityId),
    index("story_hook_session_idx").on(table.storySessionId),
    index("story_hook_household_idx").on(table.householdId),
  ],
);

export type StoryHookRecord = typeof storyHooks.$inferSelect;
export type NewStoryHookRecord = typeof storyHooks.$inferInsert;