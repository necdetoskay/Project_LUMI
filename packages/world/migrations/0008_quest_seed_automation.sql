-- S31-T04: Quest seed automation template seed.
-- Additive, forward-only. Seeds the authored quest templates referenced by
-- the QuestSeedTemplateResolver registry (S31): `lost-letter-quest` and
-- `bridge-repair-quest`. The registry in
-- packages/world/src/domain/quest-seed-template-resolver.ts MUST stay in sync
-- with these keys (the resolver only returns seeded keys + a default fallback).

BEGIN;

INSERT INTO profile.quest_templates (template_key, display_name, description, version)
VALUES
  ('lost-letter-quest', 'Kayip Mektup', 'Sahibi bilinmeyen bir mektubun izini sur ve sahibine ulastir.', 1),
  ('bridge-repair-quest', 'Kopru Onarimi', 'Koydeki hasarli kopruyu onarmak icin gereken malzemeleri topla.', 1)
ON CONFLICT (template_key) DO NOTHING;

INSERT INTO profile.quest_template_objectives (template_id, objective_index, objective_key, title)
SELECT id, 0, 'ask-around', 'Cevreye mektubu sor'
FROM profile.quest_templates WHERE template_key = 'lost-letter-quest'
ON CONFLICT (template_id, objective_index) DO NOTHING;

INSERT INTO profile.quest_template_objectives (template_id, objective_index, objective_key, title)
SELECT id, 1, 'deliver-letter', 'Mektubu sahibine teslim et'
FROM profile.quest_templates WHERE template_key = 'lost-letter-quest'
ON CONFLICT (template_id, objective_index) DO NOTHING;

INSERT INTO profile.quest_template_objectives (template_id, objective_index, objective_key, title)
SELECT id, 0, 'gather-planks', 'Kopru icin tahta topla'
FROM profile.quest_templates WHERE template_key = 'bridge-repair-quest'
ON CONFLICT (template_id, objective_index) DO NOTHING;

INSERT INTO profile.quest_template_objectives (template_id, objective_index, objective_key, title)
SELECT id, 1, 'repair-bridge', 'Kopruyu onar'
FROM profile.quest_templates WHERE template_key = 'bridge-repair-quest'
ON CONFLICT (template_id, objective_index) DO NOTHING;

COMMIT;