import {
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { uuidv7 } from "../uuid";

export const primaryId = () =>
  uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7());

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

export const actorColumns = {
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
};
