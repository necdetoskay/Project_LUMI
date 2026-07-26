# Initial Data Model

## Scope

The initial schema supports identity ownership, household boundary, configuration and auditing without modeling stories or the living universe.

## Tables

### `users`

- `id` UUID primary key
- `email` normalized, unique
- `display_name` nullable
- `status` enum or constrained string: `active`, `disabled`
- `created_at`
- `updated_at`

### `households`

- `id` UUID primary key
- `name`
- `created_at`
- `updated_at`

### `household_members`

- `id` UUID primary key
- `household_id` foreign key
- `user_id` foreign key
- `role`: `owner`, `adult`
- `created_at`
- unique `(household_id, user_id)`

### `app_settings`

- `id` UUID primary key
- `scope`: initially `system`
- `key`
- `value_json`
- `created_at`
- `updated_at`
- unique `(scope, key)`

### `audit_events`

- `id` UUID primary key
- `occurred_at`
- `actor_type`
- `actor_id` nullable
- `action`
- `target_type` nullable
- `target_id` nullable
- `correlation_id`
- `metadata_json`
- `created_at`

## Relationships

- A user may belong to one or more households in the technical baseline, although the product may later constrain this.
- A household has one or more adult members.
- Audit events are append-only and may reference actors or targets without foreign-key coupling to preserve history.

## Indexes

- unique normalized email.
- household membership lookup by user.
- audit events by occurred time.
- audit events by actor.
- audit events by target.
- audit events by correlation ID.

## Excluded tables

Do not create child profiles, worlds, regions, NPCs, items, stories, sessions, memories, embeddings, media or AI usage tables in Sprint 01.
