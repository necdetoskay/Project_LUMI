-- S33-T01: Quest reward columns.
-- Additive, forward-only. A quest template may declare an optional reward
-- ({itemDefinitionKey, quantity}); quest instances carry it after
-- instantiation so completion can grant exactly one inventory item.

BEGIN;

ALTER TABLE profile.quest_templates ADD COLUMN IF NOT EXISTS reward JSONB;
ALTER TABLE profile.quests ADD COLUMN IF NOT EXISTS reward JSONB;

COMMIT;