import { inArray } from "drizzle-orm";

import { storyOutbox } from "../db/schema/story";
import { getStoryDb } from "./db";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function listRetryableOutboxHouseholdIds(
  limit = DEFAULT_LIMIT,
): Promise<string[]> {
  const boundedLimit = Math.max(1, Math.min(Math.trunc(limit), MAX_LIMIT));
  const db = getStoryDb();
  const rows = await db
    .selectDistinct({ householdId: storyOutbox.householdId })
    .from(storyOutbox)
    .where(inArray(storyOutbox.status, ["pending", "processing"]))
    .limit(boundedLimit);

  return rows.map((row) => row.householdId).sort();
}
