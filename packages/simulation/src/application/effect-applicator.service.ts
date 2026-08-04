import type { SimulationStorePort, WorldSourcePort } from "../ports";
import type { SimulationEffect, WorldClockState } from "../domain";
import { WorldClock } from "../domain";

export interface ApplyEffectsInput {
  worldId: string;
  householdId: string;
  runId: string;
  effects: SimulationEffect[];
}

export interface RecommitPendingInput {
  worldId: string;
  householdId: string;
  runId: string;
  effectIds: string[];
  actor: "child_returned";
}

export interface AdvanceWorldClockInput {
  worldId: string;
  householdId: string;
  realElapsedSeconds: number;
}

export class EffectApplicator {
  constructor(
    private readonly store: SimulationStorePort,
    private readonly worldSource: WorldSourcePort,
  ) {}

  async commitPending(playerPreservedOnly: boolean): Promise<number> {
    void playerPreservedOnly;
    return 0;
  }

  async advanceWorldClock(
    input: AdvanceWorldClockInput,
  ): Promise<WorldClockState | null> {
    const snapshot = await this.worldSource.fetchClock(
      input.worldId,
      input.householdId,
    );
    if (!snapshot) {
      const clock = WorldClock.create({
        worldId: input.worldId,
        householdId: input.householdId,
      });
      const state = clock.getState();
      await this.worldSource.updateClock(state);
      return state;
    }

    const clock = WorldClock.fromState({
      worldId: snapshot.worldId,
      householdId: snapshot.householdId,
      currentDay: snapshot.currentDay,
      currentHour: snapshot.currentHour,
      currentMinute: snapshot.currentMinute,
      season: snapshot.season as never,
      lastAdvancedAt: snapshot.lastAdvancedAt,
      clockHash: snapshot.clockHash,
      version: snapshot.version,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = clock.advance(input.realElapsedSeconds);
    await this.worldSource.updateClock(result.state);
    return result.state;
  }
}
