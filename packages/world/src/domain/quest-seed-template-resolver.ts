import { ValidationError } from "./errors";

/**
 * Seeded registry mapping a quest_seed fact id to a quest template key.
 *
 * A quest_seed opportunity (S25) carries `evidence.factId`; at automation time
 * we must deterministically pick which authored `QuestTemplate` (S29) to
 * instantiate. The registry is the design-time authoring surface: every key
 * must exist in the `quest_templates` table (seeded by migration `0008`).
 * Unknown facts fall back to a stable default key so automation is total.
 */
export const QUEST_SEED_TEMPLATE_REGISTRY: Record<string, string> = {
  "lost-letter": "lost-letter-quest",
  "bridge-repair": "bridge-repair-quest",
};

/** Deterministic fallback used when a fact id is not explicitly mapped. */
export const QUEST_SEED_DEFAULT_TEMPLATE_KEY = "lost-letter-quest";

export function assertKnownQuestSeedTemplateKey(value: string): string {
  const known = new Set(Object.values(QUEST_SEED_TEMPLATE_REGISTRY));
  if (!known.has(value)) {
    throw new ValidationError(
      "UNKNOWN_QUEST_SEED_TEMPLATE_KEY",
      `Quest seed template key not seeded: ${value}`,
      "templateKey",
    );
  }
  return value;
}

/**
 * Deterministic `factId → templateKey` resolution. The same fact id always
 * resolves to the same template key; explicit registry entries win, otherwise
 * a stable default is returned. Callers must ensure the returned key is a
 * seeded template (registry + migration `0008` stay in sync).
 */
export class QuestSeedTemplateResolver {
  static resolve(factId: string): string {
    const normalized = factId.trim();
    if (normalized.length === 0) {
      return QUEST_SEED_DEFAULT_TEMPLATE_KEY;
    }
    return (
      QUEST_SEED_TEMPLATE_REGISTRY[normalized] ??
      QUEST_SEED_DEFAULT_TEMPLATE_KEY
    );
  }
}
