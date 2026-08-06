import type { OpportunityLedgerPort } from "../ports/opportunity-ledger.port";

export const DEFAULT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
export const DEFAULT_NOVELTY_DECAY = 0.5;
export const DEFAULT_MAX_NOVELTY = 5;

export interface LedgerGateInput {
  householdId: string;
  /** Cooldown keys to check (source, target, pair…). */
  cooldownKeys: string[];
  /** Novelty key to evaluate (source npc + opportunity type). */
  noveltyKey: string;
  /** Cooldown duration ms for keys without a specific expiry. */
  cooldownMs?: number;
  /** Novelty threshold above which a key is considered "repetitive". */
  maxNovelty?: number;
  now?: Date;
}

export interface LedgerGateResult {
  /** Keys that are still cooling down (blocked). */
  blockedCooldownKeys: string[];
  /** True if any cooldown key blocked the opportunity. */
  cooldownBlocked: boolean;
  /** Current novelty count for the key. */
  noveltyCount: number;
  /** True if novelty exceeded the threshold. */
  noveltyBlocked: boolean;
  /** True if the opportunity should be generated (all gates pass). */
  allowed: boolean;
}

/**
 * Enforces cooldown + novelty gates against the opportunity ledger. Expired
 * cooldowns are ignored (silently). Deterministic; household-scoped.
 */
export class OpportunityLedgerService {
  constructor(private readonly ledger: OpportunityLedgerPort) {}

  async gate(input: LedgerGateInput): Promise<LedgerGateResult> {
    const now = input.now ?? new Date();
    const maxNovelty = input.maxNovelty ?? DEFAULT_MAX_NOVELTY;

    const blocked: string[] = [];
    for (const key of input.cooldownKeys) {
      const entry = await this.ledger.getCooldown(input.householdId, key);
      if (entry && entry.expiresAt > now) {
        blocked.push(key);
      }
    }

    const novelty = await this.ledger.getNovelty(
      input.householdId,
      input.noveltyKey,
    );
    const noveltyCount = novelty?.firedCount ?? 0;
    const noveltyBlocked = noveltyCount >= maxNovelty;

    return {
      blockedCooldownKeys: blocked,
      cooldownBlocked: blocked.length > 0,
      noveltyCount,
      noveltyBlocked,
      allowed: !blocked.length && !noveltyBlocked,
    };
  }

  /** Records that an opportunity was generated (updates cooldown + novelty). */
  async recordFired(
    input: LedgerGateInput & { generatedKeys?: string[] },
  ): Promise<void> {
    const now = input.now ?? new Date();
    const cooldownMs = input.cooldownMs ?? DEFAULT_COOLDOWN_MS;

    const keys = input.generatedKeys?.length
      ? input.generatedKeys
      : input.cooldownKeys;
    for (const key of keys) {
      await this.ledger.recordCooldown({
        id: crypto.randomUUID(),
        householdId: input.householdId,
        cooldownKey: key,
        expiresAt: new Date(now.getTime() + cooldownMs),
        createdAt: now,
      });
    }

    const novelty = await this.ledger.getNovelty(
      input.householdId,
      input.noveltyKey,
    );
    await this.ledger.recordNovelty({
      id: crypto.randomUUID(),
      householdId: input.householdId,
      noveltyKey: input.noveltyKey,
      firedCount: (novelty?.firedCount ?? 0) + 1,
      lastFiredAt: now,
    });
  }
}
