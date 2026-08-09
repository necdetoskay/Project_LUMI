# Sprint 36 — Implementation Notes

Implemented production reward wiring:

- profiles-owned `story_reward_worker` service authority;
- fail-closed authority validation;
- active child + household tenant-scope validation;
- story-only reward provenance with `actor_user_id = null` rather than a fabricated end-user identity;
- inventory acquisition semantics reused at repository/domain level, including `story_reward` ownership history and the existing `acquire` idempotency ledger;
- worker `InventoryGrantPort` adapter;
- `quest_reward_grant` dispatch through `QuestRewardApplicator`;
- worker image includes the profiles package;
- DB-backed ULTEF L9 scenario `PX-LUMI-S36-QUEST-REWARD-PROD-001` covering real grant, replay, tenant isolation, unauthorized authority rejection and retry visibility.

Open until CI evidence is green: standard CI, Security, Integration, PX and S36 workflow.
