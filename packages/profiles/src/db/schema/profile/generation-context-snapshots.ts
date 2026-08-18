import { jsonb, timestamp, varchar } from "drizzle-orm/pg-core";

import type { GenerationContextSnapshotEnvelope } from "../../../application/generation-context-snapshot.service";
import { profileSchema } from "../schemas";

export const generationContextSnapshots = profileSchema.table(
  "generation_context_snapshots",
  {
    digest: varchar("digest", { length: 64 }).primaryKey(),
    store: varchar("store", { length: 120 }).notNull(),
    snapshotVersion: varchar("snapshot_version", { length: 40 }).notNull(),
    payload: jsonb("payload").$type<GenerationContextSnapshotEnvelope>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export type GenerationContextSnapshotRecord =
  typeof generationContextSnapshots.$inferSelect;
export type NewGenerationContextSnapshotRecord =
  typeof generationContextSnapshots.$inferInsert;
