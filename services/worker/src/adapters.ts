import type { Logger } from "@lumi/logger";
import type {
  EntityRelevance,
  RelevanceBubble,
  SimulationScheduledEvent,
  WorldClockState,
} from "@lumi/simulation";
import type { SimulationRepository } from "@lumi/simulation/db";
import type {
  NpcSnapshot,
  NpcSourcePort,
  RelevanceSourcePort,
  WorldClockSnapshot,
  WorldSourcePort,
} from "@lumi/simulation/ports";
import type { WorldCandidate, WorldDiscoveryPort } from "./job-runner";

interface CandidateRecord {
  worldId: string;
  householdId: string;
  childProfileId: string;
  childLastSeenAt: string;
}

function parseCandidate(value: unknown): CandidateRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const worldId = record.worldId;
  const householdId = record.householdId;
  const childProfileId = record.childProfileId;
  const childLastSeenAt = record.childLastSeenAt;
  if (
    typeof worldId !== "string" ||
    typeof householdId !== "string" ||
    typeof childProfileId !== "string" ||
    typeof childLastSeenAt !== "string"
  ) {
    return null;
  }
  return { worldId, householdId, childProfileId, childLastSeenAt };
}

export class EnvWorldDiscoveryAdapter implements WorldDiscoveryPort {
  constructor(
    private readonly rawCandidates: string | undefined,
    private readonly logger: Logger,
  ) {}

  async discoverAbsentWorlds(
    limit: number,
    now: Date,
  ): Promise<WorldCandidate[]> {
    if (!this.rawCandidates) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(this.rawCandidates);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        "worker.discovery.invalid_json",
        "invalid worker world candidate JSON",
        { error: message },
      );
      return [];
    }

    if (!Array.isArray(parsed)) {
      this.logger.error(
        "worker.discovery.invalid_shape",
        "worker world candidate JSON must be an array",
        {},
      );
      return [];
    }

    const candidates: WorldCandidate[] = [];
    for (const item of parsed) {
      const record = parseCandidate(item);
      if (!record) {
        this.logger.warn(
          "worker.discovery.skip",
          "skipping invalid worker world candidate",
          {},
        );
        continue;
      }
      const childLastSeenAt = new Date(record.childLastSeenAt);
      if (Number.isNaN(childLastSeenAt.getTime())) {
        this.logger.warn(
          "worker.discovery.skip",
          "skipping candidate with invalid childLastSeenAt",
          { worldId: record.worldId },
        );
        continue;
      }
      candidates.push({ ...record, childLastSeenAt, now });
      if (candidates.length >= limit) break;
    }
    return candidates;
  }
}

function toClockSnapshot(state: WorldClockState): WorldClockSnapshot {
  return {
    ...state,
    checkpointId: null,
  };
}

export class SimulationRepositoryWorldSourceAdapter implements WorldSourcePort {
  constructor(
    private readonly repo: SimulationRepository,
    private readonly logger: Logger,
  ) {}

  async fetchClock(
    worldId: string,
    householdId: string,
  ): Promise<WorldClockSnapshot | null> {
    const clock = await this.repo.findClock(worldId);
    if (!clock || clock.householdId !== householdId) return null;
    return toClockSnapshot(clock as WorldClockState);
  }

  async fetchNpcsForWorld(): Promise<NpcSnapshot[]> {
    return [];
  }

  async fetchChildLastSeen(): Promise<Date | null> {
    return null;
  }

  async fetchScheduledEvents(
    worldId: string,
    householdId: string,
    unresolvedOnly: boolean,
  ): Promise<SimulationScheduledEvent[]> {
    return this.repo.findScheduledEvents(
      worldId,
      householdId,
      unresolvedOnly,
    ) as Promise<SimulationScheduledEvent[]>;
  }

  async updateClock(state: WorldClockState): Promise<void> {
    await this.repo.upsertClock(state);
  }

  async recordWorldEvent(
    worldId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    this.logger.info("worker.world_event", "simulation world event recorded", {
      worldId,
      eventType,
      payload,
    });
  }

  async freezeWorld(worldId: string): Promise<void> {
    this.logger.info("worker.world.freeze", "world frozen by absence policy", {
      worldId,
    });
  }
}

export class EmptyNpcSourceAdapter implements NpcSourcePort {
  async fetchSnapshots(): Promise<NpcSnapshot[]> {
    return [];
  }
}

export class EmptyRelevanceSourceAdapter implements RelevanceSourcePort {
  async fetchRelevanceBubble(
    worldId: string,
    householdId: string,
  ): Promise<RelevanceBubble> {
    return {
      worldId,
      householdId,
      entities: [],
      threshold: 0.25,
    };
  }

  async fetchEntityRelevance(): Promise<EntityRelevance | null> {
    return null;
  }
}
