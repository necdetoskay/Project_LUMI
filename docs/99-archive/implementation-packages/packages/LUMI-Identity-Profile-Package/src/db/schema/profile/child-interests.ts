import {
  check,
  index,
  primaryKey,
  real,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { profileSchema } from "../schemas";
import { childProfiles } from "./child-profiles";

export const childInterests = profileSchema.table(
  "child_interests",
  {
    childProfileId: uuid("child_profile_id")
      .notNull()
      .references(() => childProfiles.id, { onDelete: "cascade" }),
    interestCode: varchar("interest_code", { length: 80 }).notNull(),
    weight: real("weight").notNull().default(0.5),
  },
  (table) => [
    primaryKey({
      columns: [table.childProfileId, table.interestCode],
      name: "child_interests_pk",
    }),
    index("child_interests_code_idx").on(table.interestCode),
    check(
      "child_interests_weight_check",
      sql`${table.weight} BETWEEN 0 AND 1`,
    ),
  ],
);
