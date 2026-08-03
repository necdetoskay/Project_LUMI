import { relations } from "drizzle-orm";
import { decisionEvents } from "./decision-events";
import { decisionTraces } from "./decision-traces";

export const decisionTracesRelations = relations(decisionTraces, () => ({}));
export const decisionEventsRelations = relations(decisionEvents, () => ({}));
