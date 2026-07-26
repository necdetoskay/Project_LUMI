import {
  jsonb,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import {
  primaryId,
  timestampColumns,
} from "../common";
import { worldSchema } from "../schemas";

export type BiomeMetadata = {
  climate?: string;
  terrain?: string[];
  flora?: string[];
  fauna?: string[];
};

export const biomes = worldSchema.table(
  "biomes",
  {
    id: primaryId(),
    code: varchar("code", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    metadata: jsonb("metadata")
      .$type<BiomeMetadata>()
      .notNull()
      .default({}),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("biomes_code_unique").on(table.code),
  ],
);

export type BiomeRecord = typeof biomes.$inferSelect;
export type NewBiomeRecord = typeof biomes.$inferInsert;
