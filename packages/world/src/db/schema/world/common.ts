import { timestamp, uuid } from "drizzle-orm/pg-core";

export const primaryId = () =>
  uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const timestampColumns = {
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
};

export const softDeleteColumn = {
  deletedAt: timestamp("deleted_at", {
    withTimezone: true,
    mode: "date",
  }),
};
