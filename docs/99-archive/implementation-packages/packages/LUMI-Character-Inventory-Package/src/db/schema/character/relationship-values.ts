import { check, index, primaryKey, real, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { characterSchema } from "../schemas";
import { relationshipDimensions } from "./relationship-dimensions";
import { relationships } from "./relationships";

export const relationshipValues = characterSchema.table(
  "relationship_values",
  {
    relationshipId: uuid("relationship_id").notNull().references(() => relationships.id, { onDelete: "cascade" }),
    dimensionId: uuid("dimension_id").notNull().references(() => relationshipDimensions.id, { onDelete: "restrict" }),
    value: real("value").notNull().default(0),
    confidence: real("confidence").notNull().default(0.5),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.relationshipId, table.dimensionId], name: "relationship_values_pk" }),
    index("relationship_values_dimension_idx").on(table.dimensionId),
    check("relationship_values_value_check", sql`${table.value} BETWEEN -1 AND 1`),
    check("relationship_values_confidence_check", sql`${table.confidence} BETWEEN 0 AND 1`),
  ],
);
