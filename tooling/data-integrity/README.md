# Migration integrity tooling

Run locally:

```bash
node tooling/data-integrity/check-migrations.mjs
node tooling/data-integrity/migration-integrity-selftest.mjs
node packages/profiles/scripts/profile-ledger-selftest.mjs
```

The CI gate discovers migration scopes automatically under `apps/` and `packages/` and rejects malformed filenames or unauthorized duplicate sequence IDs.

Do not edit an applied migration. Add a new migration instead.
