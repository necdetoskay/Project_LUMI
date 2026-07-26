import { boolean, index, jsonb, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId, timestampColumns } from "../common";
import { aiSchema } from "../schemas";
import { aiProviders } from "./providers";

export const aiModels = aiSchema.table(
  "models",
  {
    id: primaryId(),
    providerId: uuid("provider_id").notNull().references(() => aiProviders.id, { onDelete: "restrict" }),
    code: varchar("code", { length: 180 }).notNull(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    capabilityType: varchar("capability_type", { length: 60 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    pricingMetadata: jsonb("pricing_metadata").$type<Record<string, unknown>>().notNull().default({}),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("ai_models_provider_code_unique").on(table.providerId, table.code),
    index("ai_models_capability_idx").on(table.capabilityType),
  ],
);
