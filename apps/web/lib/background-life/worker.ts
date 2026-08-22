import type { Pool, PoolClient } from "pg";

import {
  BudgetPlanner,
  DrizzleSimulationRepository,
  getSimulationDb,
  SimulationRunner,
  SimulationStoreAdapter,
  WorldClockService,
  type NpcSnapshot,
  type NpcSourcePort,
  type SimulationScheduledEvent,
  type WorldClockSnapshot,
  type WorldClockState,
  type WorldSourcePort,
} from "@lumi/simulation";

import { getAuthPool } from "@/lib/auth/database";

const DEFAULT_TARGET_LIMIT = 10;
const MIN_RUN_INTERVAL_MS = 60 * 60 * 1000;
const WORKER_SEED = "lumi-background-life-v1";

export interface BackgroundLifeTarget {
  worldId: string;
  householdId: string;
  childProfileId: string;
  childLastSeenAt: Date;
}

export interface BackgroundLifeRunSummary {
  discovered: number;
  processed: number;
  skipped: number;
  frozen: number;
  committedEffects: number;
  failures: number;
}

function toDate(value: Date | string | null): Date | null {
  if (value === null) return null;
  return value instanceof Date ? value : new Date(value);
}

export function isBackgroundLifeDue(
  lastAdvancedAt: Date | null,
  now: Date,
): boolean {
  if (!lastAdvancedAt) return true;
  return now.getTime() - lastAdvancedAt.getTime() >= MIN_RUN_INTERVAL_MS;
}

async function discoverTargets(
  pool: Pool,
  now: Date,
  limit: number,
): Promise<BackgroundLifeTarget[]> {
  const result = await pool.query<{
    world_id: string;
    household_id: string;
    child_profile_id: string;
    child_last_seen_at: Date | string;
  }>(
    `
      SELECT
        w.id AS world_id,
        w.household_id,
        w.child_profile_id,
        COALESCE(
          MAX(s.last_interacted_at),
          cp.updated_at,
          cp.created_at,
          w.updated_at,
          w.created_at
        ) AS child_last_seen_at
      FROM profile.worlds w
      JOIN profile.child_profiles cp
        ON cp.id = w.child_profile_id
       AND cp.household_id = w.household_id
       AND cp.deleted_at IS NULL
      LEFT JOIN story.story_sessions s
        ON s.world_id = w.id
       AND s.household_id = w.household_id
       AND s.child_profile_id = w.child_profile_id
      LEFT JOIN simulation.world_clocks c
        ON c.world_id = w.id
       AND c.household_id = w.household_id
      WHERE w.lifecycle_status = 'active'
        AND (
          c.last_advanced_at IS NULL
          OR c.last_advanced_at <= $1::timestamptz - INTERVAL '1 hour'
        )
      GROUP BY
        w.id,
        w.household_id,
        w.child_profile_id,
        cp.updated_at,
        cp.created_at,
        w.updated_at,
        w.created_at,
        c.last_advanced_at
      ORDER BY COALESCE(c.last_advanced_at, '-infinity'::timestamptz), w.id
      LIMIT $2
    `,
    [now, limit],
  );

  return result.rows.map((row) => ({
    worldId: row.world_id,
    householdId: row.household_id,
    childProfileId: row.child_profile_id,
    childLastSeenAt: toDate(row.child_last_seen_at) ?? now,
  }));
}

class ProductionSimulationSource implements WorldSourcePort, NpcSourcePort {
  constructor(private readonly pool: Pool) {}

  async fetchClock(
    worldId: string,
    householdId: string,
  ): Promise<WorldClockSnapshot | null> {
    const result = await this.pool.query<{
      world_id: string;
      household_id: string;
      current_day: number;
      current_hour: number;
      current_minute: number;
      season: string;
      last_advanced_at: Date | string | null;
      clock_hash: string;
      version: number;
      checkpoint_id: string | null;
    }>(
      `
        SELECT
          c.world_id,
          c.household_id,
          c.current_day,
          c.current_hour,
          c.current_minute,
          c.season,
          c.last_advanced_at,
          c.clock_hash,
          c.version,
          (
            SELECT wc.id
            FROM profile.world_checkpoints wc
            WHERE wc.world_id = c.world_id
            ORDER BY wc.checkpoint_sequence DESC
            LIMIT 1
          ) AS checkpoint_id
        FROM simulation.world_clocks c
        WHERE c.world_id = $1
          AND c.household_id = $2
        LIMIT 1
      `,
      [worldId, householdId],
    );
    const row = result.rows[0];
    if (!row) return null;

    return {
      worldId: row.world_id,
      householdId: row.household_id,
      currentDay: row.current_day,
      currentHour: row.current_hour,
      currentMinute: row.current_minute,
      season: row.season,
      lastAdvancedAt: toDate(row.last_advanced_at),
      clockHash: row.clock_hash,
      version: row.version,
      checkpointId: row.checkpoint_id,
    };
  }

  async fetchSnapshots(
    worldId: string,
    householdId: string,
  ): Promise<NpcSnapshot[]> {
    const result = await this.pool.query<{
      npc_id: string;
      household_id: string;
      character_id: string;
      location_id: string | null;
      need_types: unknown;
      relationship_to_character: string | number;
      last_interaction_at: Date | string;
    }>(
      `
        SELECT
          npc_id,
          household_id,
          character_id,
          location_id,
          need_types,
          relationship_to_character,
          last_interaction_at
        FROM npc_intelligence.npc_snapshots
        WHERE world_id = $1
          AND household_id = $2
        ORDER BY npc_id
      `,
      [worldId, householdId],
    );

    return result.rows.map((row) => ({
      npcId: row.npc_id,
      householdId: row.household_id,
      characterId: row.character_id,
      locationId: row.location_id,
      needTypes: Array.isArray(row.need_types)
        ? row.need_types.filter((value): value is string => typeof value === "string")
        : [],
      relationshipToCharacter: Number(row.relationship_to_character),
      lastInteractionAt: toDate(row.last_interaction_at) ?? new Date(0),
    }));
  }

  fetchNpcsForWorld(
    worldId: string,
    householdId: string,
  ): Promise<NpcSnapshot[]> {
    return this.fetchSnapshots(worldId, householdId);
  }

  async fetchChildLastSeen(
    worldId: string,
    childProfileId: string,
  ): Promise<Date | null> {
    const result = await this.pool.query<{ last_seen_at: Date | string | null }>(
      `
        SELECT COALESCE(
          MAX(s.last_interacted_at),
          cp.updated_at,
          cp.created_at
        ) AS last_seen_at
        FROM profile.worlds w
        JOIN profile.child_profiles cp
          ON cp.id = w.child_profile_id
         AND cp.household_id = w.household_id
         AND cp.deleted_at IS NULL
        LEFT JOIN story.story_sessions s
          ON s.world_id = w.id
         AND s.household_id = w.household_id
         AND s.child_profile_id = w.child_profile_id
        WHERE w.id = $1
          AND w.child_profile_id = $2
        GROUP BY cp.updated_at, cp.created_at
      `,
      [worldId, childProfileId],
    );
    return toDate(result.rows[0]?.last_seen_at ?? null);
  }

  async fetchScheduledEvents(
    worldId: string,
    householdId: string,
    unresolvedOnly: boolean,
  ): Promise<SimulationScheduledEvent[]> {
    const result = await this.pool.query<{
      id: string;
      world_id: string;
      household_id: string;
      scheduled_at: Date | string;
      event_type: SimulationScheduledEvent["eventType"];
      critical: boolean;
      player_preserved: boolean;
      payload: Record<string, unknown>;
      resolved: boolean;
      resolved_at: Date | string | null;
      created_at: Date | string;
    }>(
      `
        SELECT
          id,
          world_id,
          household_id,
          scheduled_at,
          event_type,
          critical,
          player_preserved,
          payload,
          resolved,
          resolved_at,
          created_at
        FROM simulation.scheduled_events
        WHERE world_id = $1
          AND household_id = $2
          AND scheduled_at <= NOW()
          AND ($3::boolean = false OR resolved = false)
        ORDER BY scheduled_at, id
      `,
      [worldId, householdId, unresolvedOnly],
    );

    return result.rows.map((row) => ({
      id: row.id,
      worldId: row.world_id,
      householdId: row.household_id,
      scheduledAt: toDate(row.scheduled_at) ?? new Date(0),
      eventType: row.event_type,
      critical: row.critical,
      playerPreserved: row.player_preserved,
      payload: row.payload ?? {},
      resolved: row.resolved,
      resolvedAt: toDate(row.resolved_at),
      createdAt: toDate(row.created_at) ?? new Date(0),
    }));
  }

  async updateClock(state: WorldClockState): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO simulation.world_clocks (
          world_id,
          household_id,
          current_day,
          current_hour,
          current_minute,
          season,
          last_advanced_at,
          clock_hash,
          version,
          created_at,
          updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (world_id) DO UPDATE SET
          current_day = EXCLUDED.current_day,
          current_hour = EXCLUDED.current_hour,
          current_minute = EXCLUDED.current_minute,
          season = EXCLUDED.season,
          last_advanced_at = EXCLUDED.last_advanced_at,
          clock_hash = EXCLUDED.clock_hash,
          version = EXCLUDED.version,
          updated_at = EXCLUDED.updated_at
        WHERE simulation.world_clocks.household_id = EXCLUDED.household_id
      `,
      [
        state.worldId,
        state.householdId,
        state.currentDay,
        state.currentHour,
        state.currentMinute,
        state.season,
        state.lastAdvancedAt,
        state.clockHash,
        state.version,
        state.createdAt,
        state.updatedAt,
      ],
    );
  }

  async recordWorldEvent(
    worldId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    console.info(
      "LUMI_BACKGROUND_LIFE_WORLD_EVENT",
      JSON.stringify({ worldId, eventType, payload }),
    );
  }

  async freezeWorld(worldId: string): Promise<void> {
    await this.pool.query(
      `
        UPDATE profile.worlds
        SET lifecycle_status = 'frozen', updated_at = NOW()
        WHERE id = $1 AND lifecycle_status = 'active'
      `,
      [worldId],
    );
  }
}

async function tryAcquireWorldLock(
  client: PoolClient,
  worldId: string,
): Promise<boolean> {
  const result = await client.query<{ locked: boolean }>(
    "SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS locked",
    [`lumi:background-life:${worldId}`],
  );
  return result.rows[0]?.locked === true;
}

async function releaseWorldLock(
  client: PoolClient,
  worldId: string,
): Promise<void> {
  await client.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [
    `lumi:background-life:${worldId}`,
  ]);
}

export async function runProductionBackgroundLife(input?: {
  now?: Date;
  limit?: number;
}): Promise<BackgroundLifeRunSummary> {
  const now = input?.now ?? new Date();
  const limit = Math.max(1, Math.min(input?.limit ?? DEFAULT_TARGET_LIMIT, 25));
  const pool = getAuthPool();
  const targets = await discoverTargets(pool, now, limit);
  const source = new ProductionSimulationSource(pool);
  const repository = new DrizzleSimulationRepository(getSimulationDb());
  const store = new SimulationStoreAdapter(repository);
  const runner = new SimulationRunner(store, source, source, new BudgetPlanner());
  const clockService = new WorldClockService(source);

  const summary: BackgroundLifeRunSummary = {
    discovered: targets.length,
    processed: 0,
    skipped: 0,
    frozen: 0,
    committedEffects: 0,
    failures: 0,
  };

  for (const target of targets) {
    const lockClient = await pool.connect();
    let locked = false;
    try {
      locked = await tryAcquireWorldLock(lockClient, target.worldId);
      if (!locked) {
        summary.skipped += 1;
        continue;
      }

      const clockBefore = await source.fetchClock(
        target.worldId,
        target.householdId,
      );
      if (
        clockBefore?.lastAdvancedAt &&
        !isBackgroundLifeDue(clockBefore.lastAdvancedAt, now)
      ) {
        summary.skipped += 1;
        continue;
      }

      const result = await runner.run({
        worldId: target.worldId,
        householdId: target.householdId,
        childProfileId: target.childProfileId,
        childLastSeenAt: target.childLastSeenAt,
        now,
        seed: WORKER_SEED,
      });

      await clockService.ensureClock(target.worldId, target.householdId);
      const realElapsedSeconds = clockBefore?.lastAdvancedAt
        ? Math.max(
            0,
            Math.floor(
              (now.getTime() - clockBefore.lastAdvancedAt.getTime()) / 1000,
            ),
          )
        : 0;
      await clockService.tickClock(
        target.worldId,
        target.householdId,
        realElapsedSeconds,
      );

      summary.processed += 1;
      summary.committedEffects += result.committedCount;
      if (result.frozen) summary.frozen += 1;
    } catch (error) {
      summary.failures += 1;
      console.error("LUMI_BACKGROUND_LIFE_TARGET_FAILED", {
        worldId: target.worldId,
        householdId: target.householdId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (locked) {
        await releaseWorldLock(lockClient, target.worldId).catch(() => undefined);
      }
      lockClient.release();
    }
  }

  console.info("LUMI_BACKGROUND_LIFE_RUN", JSON.stringify(summary));
  return summary;
}
