/**
 * S21-T04: load-test seed fixtures.
 *
 * Synthetic, metadata-only fixtures for the load harness — NO real child
 * data and NO real household IDs. Safe to use in CI against a disposable
 * database.
 */

export interface LoadSeedRow {
  householdId: string;
  sessionId: string;
  childProfileId: string;
  storyVersionId: string;
  initialSceneId: string;
}

const HOUSEHOLDS = 3;
const SESSIONS_PER_HOUSEHOLD = 5;

export function buildLoadSeed(
  count = HOUSEHOLDS * SESSIONS_PER_HOUSEHOLD,
): LoadSeedRow[] {
  const rows: LoadSeedRow[] = [];
  for (let i = 0; i < count; i++) {
    const householdId = `hh-load-${i % HOUSEHOLDS}`;
    rows.push({
      householdId,
      sessionId: `load-sess-${i}-${Date.now()}`,
      childProfileId: `child-load-${i % 5}`,
      storyVersionId: "story-ver-load-v1",
      initialSceneId: "scene-load-start",
    });
  }
  return rows;
}

export function seedSummary(rows: LoadSeedRow[]) {
  const households = new Set(rows.map((r) => r.householdId));
  return {
    total: rows.length,
    distinctHouseholds: households.size,
    sessionsPerHousehold: rows.length / households.size,
  };
}
