import type pg from "pg";

export type StoryMigrationStatus = "applied" | "skipped";

export type StoryMigrationInput = {
  filename: string;
  sql: string;
  afterSqlApplied?: () => void | Promise<void>;
};

export function ensureStoryMigrationLedger(
  client: pg.PoolClient,
): Promise<void>;

export function getAppliedStoryMigrationFiles(
  client: pg.PoolClient,
): Promise<Set<string>>;

export function applyStoryMigration(
  pool: pg.Pool,
  input: StoryMigrationInput,
): Promise<{ status: StoryMigrationStatus }>;
