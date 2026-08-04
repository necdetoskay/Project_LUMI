import { timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "./common";
import { simulationSchema } from "./schemas";

export const simulationIdempotencyLedger = simulationSchema.table(
  "simulation_idempotency_ledger",
  {
    id: primaryId(),
    householdId: uuid("household_id").notNull(),
    worldId: uuid("world_id"),
    operationType: varchar("operation_type", { length: 60 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uqSimulationIdempotency: uniqueIndex("uq_simulation_idempotency").on(
      table.householdId,
      table.operationType,
      table.idempotencyKey,
    ),
  }),
);

export type SimulationIdempotencyLedgerRecord = typeof simulationIdempotencyLedger.$inferSelect;
export type NewSimulationIdempotencyLedgerRecord = typeof simulationIdempotencyLedger.$inferInsert;
