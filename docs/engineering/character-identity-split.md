# Character Identity Split

PR-3 of the Data Integrity Hardening epic introduces typed identity boundaries for child avatars and NPCs while preserving `profile.lumi_characters` as the temporary payload source.

## Invariants

- `profile.child_avatars` can reference only `lumi_characters.character_subtype = 'child_avatar'` rows.
- `profile.world_npcs` can reference only `lumi_characters.character_subtype = 'npc'` rows.
- One active child avatar exists per child profile.
- Every NPC is bound to exactly one world in the same current child/household scope during backfill.
- Backfill is fail-closed: ambiguous NPC-to-world ownership aborts migration instead of guessing.

The subtype invariant is enforced with composite foreign keys to `(lumi_characters.id, lumi_characters.character_subtype)`. This removes UUID-only semantic ambiguity while consumers are migrated in PR-4.

## Rollout

1. EXPAND: create typed identity tables.
2. BACKFILL: copy identity/scope from the legacy character rows.
3. VERIFY: compare source/split counts and reject ambiguous NPC world ownership.
4. ENFORCE: composite subtype and child-scope foreign keys.
5. SWITCH: PR-4 moves consumers to explicit avatar/NPC repositories.
6. CONTRACT: PR-9 removes legacy ambiguity after all consumers are proven migrated.
