import {
  index,
  integer,
  jsonb,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { profileSchema } from "../schemas";
import { lumiCharacters } from "./lumi-characters";

export const characterDomainEvents = profileSchema.table(
  "character_domain_events",
  {
    id: primaryId(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => lumiCharacters.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    eventVersion: integer("event_version").notNull().default(1),
    aggregateVersion: integer("aggregate_version").notNull(),
    actorHouseholdId: uuid("actor_household_id").notNull(),
    actorUserId: uuid("actor_user_id"),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    charIdx: index("character_domain_events_char_idx").on(
      table.characterId,
      table.createdAt,
    ),
    typeIdx: index("character_domain_events_type_idx").on(
      table.eventType,
      table.createdAt,
    ),
  }),
);

export type CharacterDomainEventRecord =
  typeof characterDomainEvents.$inferSelect;
export type NewCharacterDomainEventRecord =
  typeof characterDomainEvents.$inferInsert;
