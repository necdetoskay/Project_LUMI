# Runbook: Staging Migration Drill

**Scope:** Sprint 20 (S20-T03). Verifies the full migration path against a
realistic staging snapshot before the first release candidate ships.

All migrations in Project LUMI are **additive (CREATE only)** — `IF NOT EXISTS`
is used for idempotency, and there is no `schema_version` table (per
`migration-failure.md`). Therefore **rollback is not supported**; recovery from
a failed migration in this rehearsal is a forward-fix + restore decision.

## Prerequisites

- Docker Compose available and `pnpm` installed.
- `DATABASE_URL` points at the staging Postgres, or the local compose DB
  (`postgres:5432`, db `lumi`, user `lumi`, password from `.env`).
- A staging data dump is available (see `docs/ops/runbooks/db-failure.md` for
  restore mechanics). The rehearsal runs against a **throwaway staging copy**,
  never against production.

## Safety Guard

- The drill refuses to run against any database whose name contains `prod`,
  `production`, or `live`. Enforce this before applying migrations.

  ```bash
  case "$DATABASE_URL" in
    *prod*|*production*|*live*) echo "REFUSING to run on production."; exit 1 ;;
  esac
  ```

## Procedure

1. **Restore staging snapshot** into a throwaway DB and point `DATABASE_URL`
   at it (isolated from prod).

2. **Reset the migration runner** (idempotency path):

   ```bash
   pnpm --filter @lumi/profiles profile:migrate
   ```
   Re-run all package migrations once; they use `IF NOT EXISTS`, so the
   snapshot state is preserved.

3. **Apply the candidate migration set** in dependency order (forward-only):

   ```bash
   # Core (profiles / world) first, then story/media/simulation/privacy,
   # then npc-intelligence, then web auth.
   pnpm --filter @lumi/profiles profile:migrate
   pnpm --filter @lumi/world world:migrate
   pnpm --filter @lumi/story story:migrate
   pnpm --filter @lumi/media media:migrate
   pnpm --filter @lumi/simulation simulation:migrate
   pnpm --filter @lumi/privacy privacy:migrate
   pnpm --filter @lumi/npc-intelligence npc:migrate
   pnpm --filter @lumi/prompts prompt:migrate
   pnpm --filter @lumi/ai ai:migrate
   pnpm --filter @lumi/web auth:migrate
   ```

4. **Verify schema**: confirm new tables/columns exist and old ones are intact.

   ```bash
   psql "$DATABASE_URL" -c "\dt"
   psql "$DATABASE_URL" -c "\d+ profile.households"
   ```

5. **Smoke test**: start the web service against the migrated DB and hit
   `/api/health` plus one authenticated household-scoped endpoint.

6. **Record outcome** (see decision matrix below).

## Decision Matrix (no rollback)

Because migrations are additive and there is no rollback script, a failure
during this drill is resolved by **forward-fix or restore** — never by roll
back:

| Step 5 result | Action |
|---|---|
| All migrations succeed AND smoke test passes | Forward — green for RC. |
| Migration fails (syntax/conflict/permission) | Fix SQL in migration file, re-run from step 3. Snapshot is intact. |
| Data integrity violation on existing data | Write a follow-up additive migration (backfill + constraint), re-run. |
| Smoke test fails against migrated DB | Restore snapshot from step 1, apply forward-fix migration, re-run drill. |
| Irreparable data loss identified | **Restore** throwaway staging from fresh dump and re-enter drill. |

## Verification

- All `*migrations` scripts exit `0` from a clean staging snapshot.
- `\dt` / `\d+` show expected schema and **no data loss** on existing tables.
- Web `/api/health` returns `200` and a household-scoped endpoint returns `200`
  (not `401/403/500`).

## Cleanup

- Drop the throwaway staging DB created for this drill.
- If a forward-fix migration was authored, commit it with the
  `fix(migration):` prefix and re-run the CI migration path in a PR.
