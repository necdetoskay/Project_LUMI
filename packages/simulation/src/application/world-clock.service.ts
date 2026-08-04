import type { WorldSourcePort } from "../ports";
import type { WorldClockState } from "../domain";
import { WorldClock, type AbsenceInfo, computeAbsencePolicy } from "../domain";

export interface ClockTickResult {
  clockState: WorldClockState;
  gameHoursElapsed: number;
}

export class WorldClockService {
  constructor(private readonly worldSource: WorldSourcePort) {}

  async tickClock(
    worldId: string,
    householdId: string,
    realElapsedSeconds: number,
  ): Promise<ClockTickResult | null> {
    const snapshot = await this.worldSource.fetchClock(worldId, householdId);
    if (!snapshot) {
      return null;
    }

    const state: WorldClockState = {
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
    };
    const clock = WorldClock.fromState(state);

    const result = clock.advance(realElapsedSeconds);
    await this.worldSource.updateClock(result.state);

    return {
      clockState: result.state,
      gameHoursElapsed: result.gameHoursElapsed,
    };
  }

  async ensureClock(
    worldId: string,
    householdId: string,
  ): Promise<WorldClockState> {
    const existing = await this.worldSource.fetchClock(worldId, householdId);
    if (existing) {
      return {
        worldId: existing.worldId,
        householdId: existing.householdId,
        currentDay: existing.currentDay,
        currentHour: existing.currentHour,
        currentMinute: existing.currentMinute,
        season: existing.season as never,
        lastAdvancedAt: existing.lastAdvancedAt,
        clockHash: existing.clockHash,
        version: existing.version,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const clock = WorldClock.create({ worldId, householdId });
    const state = clock.getState();
    await this.worldSource.updateClock(state);
    return state;
  }

  computeAbsencePolicy(absence: AbsenceInfo) {
    return computeAbsencePolicy(absence);
  }
}
