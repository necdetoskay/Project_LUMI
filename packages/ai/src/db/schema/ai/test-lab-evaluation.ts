import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { primaryId } from "./common";
import { aiSchema } from "./schemas";
import {
  testLabRunCandidates,
  testLabRuns,
  testLabSessions,
} from "./test-lab";

export const testLabEvaluationRubrics = aiSchema.table(
  "test_lab_evaluation_rubrics",
  {
    id: primaryId(),
    rubricKey: varchar("rubric_key", { length: 160 }).notNull(),
    revision: integer("revision").notNull(),
    targetType: varchar("target_type", { length: 40 }).notNull(),
    label: varchar("label", { length: 240 }).notNull(),
    criteria: jsonb("criteria").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("test_lab_eval_rubric_key_revision_uq").on(
      table.rubricKey,
      table.revision,
    ),
    check("chk_test_lab_eval_rubric_revision", sql`${table.revision} > 0`),
    check(
      "chk_test_lab_eval_rubric_target_type",
      sql`${table.targetType} IN ('character', 'world', 'npc', 'story', 'story_arc')`,
    ),
  ],
);

export const testLabCandidateEvaluations = aiSchema.table(
  "test_lab_candidate_evaluations",
  {
    id: primaryId(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => testLabSessions.id, { onDelete: "cascade" }),
    runId: uuid("run_id")
      .notNull()
      .references(() => testLabRuns.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => testLabRunCandidates.id, { onDelete: "cascade" }),
    rubricKey: varchar("rubric_key", { length: 160 }).notNull(),
    rubricRevision: integer("rubric_revision").notNull(),
    mode: varchar("mode", { length: 30 }).notNull(),
    authorType: varchar("author_type", { length: 20 }).notNull(),
    authorId: varchar("author_id", { length: 240 }).notNull(),
    judgeModelSlug: varchar("judge_model_slug", { length: 240 }),
    findings: jsonb("findings").notNull(),
    overallScore: doublePrecision("overall_score").notNull(),
    rank: integer("rank"),
    usageSnapshot: jsonb("usage_snapshot"),
    provenance: jsonb("provenance"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("test_lab_candidate_eval_candidate_idx").on(table.candidateId),
    index("test_lab_candidate_eval_rubric_idx").on(
      table.rubricKey,
      table.rubricRevision,
    ),
    index("test_lab_candidate_eval_author_idx").on(
      table.authorType,
      table.authorId,
    ),
    check(
      "chk_test_lab_candidate_eval_mode",
      sql`${table.mode} IN ('absolute', 'blind_ranking')`,
    ),
    check(
      "chk_test_lab_candidate_eval_author_type",
      sql`${table.authorType} IN ('judge', 'human')`,
    ),
    check(
      "chk_test_lab_candidate_eval_judge_model",
      sql`(${table.authorType} = 'judge' AND ${table.judgeModelSlug} IS NOT NULL) OR (${table.authorType} = 'human' AND ${table.judgeModelSlug} IS NULL)`,
    ),
    check(
      "chk_test_lab_candidate_eval_rank",
      sql`${table.rank} IS NULL OR ${table.rank} > 0`,
    ),
  ],
);

export type TestLabEvaluationRubricRecord =
  typeof testLabEvaluationRubrics.$inferSelect;
export type TestLabCandidateEvaluationRecord =
  typeof testLabCandidateEvaluations.$inferSelect;
