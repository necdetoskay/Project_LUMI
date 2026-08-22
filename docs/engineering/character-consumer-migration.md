# Character Consumer Migration

PR-4 of Data Integrity Hardening switches semantic character reads to typed identity registries introduced in PR-3.

## Contracts

- Child-avatar lookup is performed through `profile.child_avatars`, never by relying on a raw subtype predicate over `profile.lumi_characters`.
- NPC lookup is performed through `profile.world_npcs` and requires world/household scope.
- Legacy child-avatar creation remains compatible through the `sync_child_avatar_registry` trigger until the generic character writer is retired.
- `profile.lumi_characters` remains a temporary payload table; typed registries are the authoritative identity boundary.

## Repository API

- `ChildAvatarRepository.getById()`
- `ChildAvatarRepository.getByChildProfileId()`
- `ChildAvatarRepository.listByHousehold()`
- `NpcRepository.getById()`
- `NpcRepository.listByWorldId()`

PR-9 will contract the remaining generic character surface after all call sites are proven migrated.
