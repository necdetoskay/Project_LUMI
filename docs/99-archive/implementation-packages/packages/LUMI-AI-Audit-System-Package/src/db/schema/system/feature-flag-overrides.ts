import { boolean, index, jsonb, primaryKey, uuid, varchar } from "drizzle-orm/pg-core";
import { systemSchema } from "../schemas";
import { featureFlags } from "./feature-flags";

export const featureFlagOverrides = systemSchema.table(
  "feature_flag_overrides",
  {
    featureFlagId: uuid("feature_flag_id").notNull().references(() => featureFlags.id, { onDelete: "cascade" }),
    subjectType: varchar("subject_type", { length: 80 }).notNull(),
    subjectId: uuid("subject_id").notNull(),
    isEnabled: boolean("is_enabled").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    primaryKey({ columns: [table.featureFlagId, table.subjectType, table.subjectId], name: "feature_flag_overrides_pk" }),
    index("feature_flag_overrides_subject_idx").on(table.subjectType, table.subjectId),
  ],
);
