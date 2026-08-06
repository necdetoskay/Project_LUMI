export interface CooldownEntry {
  id: string;
  householdId: string;
  /** Cooldown key: source, target, or source:target pair scope. */
  cooldownKey: string;
  /** Moment the cooldown expires. */
  expiresAt: Date;
  createdAt: Date;
}

export interface NoveltyEntry {
  id: string;
  householdId: string;
  /** Novelty key: source npc + opportunity type. */
  noveltyKey: string;
  /** How many times this key has fired (drives novelty decay). */
  firedCount: number;
  lastFiredAt: Date;
}

export interface OpportunityLedgerPort {
  /** Records a cooldown for a key; no-ops if already active. */
  recordCooldown(entry: CooldownEntry): Promise<void>;
  /** Returns the active cooldown expiry for a key, if any. */
  getCooldown(
    householdId: string,
    cooldownKey: string,
  ): Promise<CooldownEntry | undefined>;
  /** Lists active (non-expired) cooldowns for a household. */
  listActiveCooldowns(householdId: string, now: Date): Promise<CooldownEntry[]>;
  /** Increments novelty firedCount for a key; creates on first fire. */
  recordNovelty(entry: NoveltyEntry): Promise<NoveltyEntry>;
  /** Returns the novelty entry for a key, if any. */
  getNovelty(
    householdId: string,
    noveltyKey: string,
  ): Promise<NoveltyEntry | undefined>;
}
