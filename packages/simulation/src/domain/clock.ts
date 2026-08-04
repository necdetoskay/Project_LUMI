import type { Season, TimeOfDay, WorldClockState } from "./time";
import { SEASONS, assertKnownSeason } from "./time";
import { hashStable } from "./hash";

export const HOURS_PER_DAY = 24;
export const MINUTES_PER_HOUR = 60;
export const DAYS_PER_SEASON = 90;

export interface AdvanceClockInput {
  worldId: string;
  householdId: string;
  realElapsedSeconds: number;
}

export interface AdvanceClockResult {
  state: WorldClockState;
  gameHoursElapsed: number;
}

function timeOfDayFromHour(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 12) return "morning";
  if (hour >= 12 && hour < 14) return "noon";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "evening";
  if (hour >= 20 && hour < 23) return "dusk";
  return "night";
}

function seasonFromDay(day: number): Season {
  const seasonIndex = Math.floor((day - 1) / DAYS_PER_SEASON) % SEASONS.length;
  return SEASONS[seasonIndex]!;
}

export class WorldClock {
  private constructor(private state: WorldClockState) {}

  static create(input: {
    worldId: string;
    householdId: string;
    season?: Season;
  }): WorldClock {
    const now = new Date();
    const state: WorldClockState = {
      worldId: input.worldId,
      householdId: input.householdId,
      currentDay: 1,
      currentHour: 7,
      currentMinute: 0,
      season: input.season ?? "spring",
      lastAdvancedAt: null,
      clockHash: "",
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    state.clockHash = this.computeHash(state);
    return new WorldClock(state);
  }

  static fromState(state: WorldClockState): WorldClock {
    assertKnownSeason(state.season);
    return new WorldClock(state);
  }

  private static computeHash(state: WorldClockState): string {
    return hashStable({
      worldId: state.worldId,
      currentDay: state.currentDay,
      currentHour: state.currentHour,
      currentMinute: state.currentMinute,
      season: state.season,
      version: state.version,
    });
  }

  getState(): WorldClockState {
    return { ...this.state };
  }

  get worldId(): string {
    return this.state.worldId;
  }

  get householdId(): string {
    return this.state.householdId;
  }

  get day(): number {
    return this.state.currentDay;
  }

  get hour(): number {
    return this.state.currentHour;
  }

  get timeOfDay(): TimeOfDay {
    return timeOfDayFromHour(this.state.currentHour);
  }

  get season(): Season {
    return this.state.season;
  }

  advance(realElapsedSeconds: number): AdvanceClockResult {
    const GAME_SECONDS_PER_REAL_SECOND = 120;
    const totalGameSeconds = Math.floor(
      realElapsedSeconds * GAME_SECONDS_PER_REAL_SECOND,
    );

    let totalMinutes =
      this.state.currentHour * MINUTES_PER_HOUR +
      this.state.currentMinute +
      totalGameSeconds / 60;

    const totalDayMinutes = HOURS_PER_DAY * MINUTES_PER_HOUR;
    const fullDays = Math.floor(totalMinutes / totalDayMinutes);
    totalMinutes -= fullDays * totalDayMinutes;

    let day = this.state.currentDay + fullDays;
    let hour = Math.floor(totalMinutes / MINUTES_PER_HOUR);
    let minute = Math.round(totalMinutes % MINUTES_PER_HOUR);

    if (minute >= MINUTES_PER_HOUR) {
      hour += 1;
      minute -= MINUTES_PER_HOUR;
    }
    if (hour >= HOURS_PER_DAY) {
      day += 1;
      hour -= HOURS_PER_DAY;
    }

    const newSeason = seasonFromDay(day);
    const gameHoursElapsed = totalGameSeconds / 3600;

    this.state.currentDay = day;
    this.state.currentHour = hour;
    this.state.currentMinute = minute;
    this.state.season = newSeason;
    this.state.lastAdvancedAt = new Date();
    this.state.version += 1;
    this.state.updatedAt = new Date();
    this.state.clockHash = WorldClock.computeHash(this.state);

    return {
      state: this.getState(),
      gameHoursElapsed,
    };
  }

  rekey(): string {
    return WorldClock.computeHash(this.state);
  }
}
