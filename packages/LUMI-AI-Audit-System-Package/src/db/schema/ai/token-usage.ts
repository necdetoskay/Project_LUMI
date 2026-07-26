import { integer, primaryKey, uuid } from "drizzle-orm/pg-core";
import { aiSchema } from "../schemas";
import { generationAttempts } from "./generation-attempts";

export const tokenUsage = aiSchema.table(
  "token_usage",
  {
    generationAttemptId: uuid("generation_attempt_id").notNull().references(() => generationAttempts.id, { onDelete: "cascade" }),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cachedInputTokens: integer("cached_input_tokens").notNull().default(0),
    reasoningTokens: integer("reasoning_tokens").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.generationAttemptId], name: "token_usage_pk" }),
  ],
);
