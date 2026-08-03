# Runbook: Migration Failure

## Symptoms

- Migration script exits with non-zero code.
- Application fails to start or returns schema-related errors.
- New database objects missing.

## Possible Causes

1. SQL syntax error in migration file.
2. Conflicting object names with existing schema.
3. Insufficient database permissions.
4. Migration ordering issue (applied out of sequence).
5. Data integrity violation (NOT NULL, FK constraint).

## Diagnosis

1. Run migration in dry-run or check current state:
   ```
   psql "$DATABASE_URL" -c "SELECT to_regclass('profile.households');"
   psql "$DATABASE_URL" -c "\dt profile.*"
   ```
   - `to_regclass` returns `profile.households` if the migration has been applied, `null` otherwise.
   - Current profile migration runner (`profile-migrate.mjs`) does **not** create a `profile.schema_version` table — it applies SQL files sequentially from the `migrations/` directory and each file uses `IF NOT EXISTS` for idempotency.

2. Check migration logs for specific SQL error.

3. Verify migration file content and ordering:
   ```
   ls -la packages/profiles/migrations/
   ```

## Resolution

### Syntax error
- Fix the SQL in the affected migration file.
- Re-run: `pnpm --filter @lumi/profiles profile:migrate`

### Conflicting object
- Drop or rename the conflicting object if safe.
- Or create a new additive migration.

### Data integrity
- Add default values or clean data before migration.
- Use `ALTER TABLE ... ALTER COLUMN ... SET DEFAULT` before adding NOT NULL.

### Rollback
- All current migrations are additive (CREATE only). Rollback by dropping tables manually.
- After rollback, fix and re-run.

## Prevention

- Always write additive (non-destructive) migrations.
- Test migrations against a data dump before production.
- Review migration SQL with the engineering team.

## Verification

- Re-run the migration successfully.
- Confirm application starts without schema errors.
- Run integration tests.
