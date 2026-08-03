import { real, timestamp, varchar } from "drizzle-orm/pg-core";
import { profileSchema } from "../schemas";
import { lumiCharacters } from "./lumi-characters";

export const characterInfluence = profileSchema.table(
  "character_influence",
  {
    characterId: varchar("character_id", { length: 36 })
      .notNull()
      .references(() => lumiCharacters.id, { onDelete: "cascade" }),
    emotional: real("emotional").notNull().default(0),
    social: real("social").notNull().default(0),
    cultural: real("cultural").notNull().default(0),
    educational: real("educational").notNull().default(0),
    political: real("political").notNull().default(0),
    environmental: real("environmental").notNull().default(0),
    familial: real("familial").notNull().default(0),
    spiritual: real("spiritual").notNull().default(0),
    historical: real("historical").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
);

export type CharacterInfluenceRecord = typeof characterInfluence.$inferSelect;
export type NewCharacterInfluenceRecord = typeof characterInfluence.$inferInsert;
