import { timestamp, uuid } from "drizzle-orm/pg-core";

export function primaryId(columnName = "id") {
  return uuid(columnName)
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
}

export function timestampColumns(prefix = "") {
  return {
    createdAt: timestamp(`${prefix}created_at`, {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp(`${prefix}updated_at`, {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  };
}
