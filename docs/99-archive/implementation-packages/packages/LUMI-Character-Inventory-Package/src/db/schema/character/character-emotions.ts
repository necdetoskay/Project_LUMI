import { check, index, primaryKey, real, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { characterSchema } from "../schemas";
import { characters } from "./characters";
import { emotionDefinitions } from "./emotion-definitions";

export const characterEmotions = characterSchema.table(
  "character_emotions",
  {
    characterId: uuid("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
    emotionDefinitionId: uuid("emotion_definition_id").notNull().references(() => emotionDefinitions.id, { onDelete: "restrict" }),
    intensity: real("intensity").notNull().default(0),
    decayRate: real("decay_rate").notNull().default(0.1),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.characterId, table.emotionDefinitionId], name: "character_emotions_pk" }),
    index("character_emotions_emotion_idx").on(table.emotionDefinitionId),
    check("character_emotions_intensity_check", sql`${table.intensity} BETWEEN 0 AND 1`),
    check("character_emotions_decay_check", sql`${table.decayRate} BETWEEN 0 AND 1`),
  ],
);
