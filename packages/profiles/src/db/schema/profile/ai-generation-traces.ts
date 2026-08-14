import {
  bigint,
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { profileSchema } from "../schemas";
import { households } from "./households";
import { childProfiles } from "./child-profiles";
import { characterCreationCycles } from "./character-creation-cycles";

export interface AiPricingSnapshot {
  currency: "USD";
  promptUsdPerMillionTokens?: number;
  completionUsdPerMillionTokens?: number;
  modelId: string;
  capturedAt: string;
}

export const aiGenerationTraces = profileSchema.table("ai_generation_traces", {
  id: primaryId(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  childProfileId: uuid("child_profile_id").references(() => childProfiles.id, {
    onDelete: "set null",
  }),
  creationCycleId: uuid("creation_cycle_id").references(
    () => characterCreationCycles.id,
    { onDelete: "set null" },
  ),
  taskType: varchar("task_type", { length: 80 }).notNull(),
  promptKey: varchar("prompt_key", { length: 160 }).notNull(),
  promptVersion: integer("prompt_version").notNull(),
  provider: varchar("provider", { length: 40 }).notNull(),
  modelId: text("model_id").notNull(),
  inputContext: jsonb("input_context")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  outputPayload: jsonb("output_payload").$type<Record<string, unknown>>(),
  validationStatus: varchar("validation_status", { length: 20 })
    .$type<"valid" | "invalid">()
    .notNull(),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  totalTokens: integer("total_tokens"),
  estimatedCostUsdMicros: bigint("estimated_cost_usd_micros", {
    mode: "number",
  }),
  costSource: varchar("cost_source", { length: 40 }).$type<
    "provider_reported" | "pricing_snapshot"
  >(),
  pricingSnapshot: jsonb("pricing_snapshot").$type<AiPricingSnapshot>(),
  latencyMs: integer("latency_ms").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AiGenerationTraceRecord = typeof aiGenerationTraces.$inferSelect;
export type NewAiGenerationTraceRecord = typeof aiGenerationTraces.$inferInsert;
