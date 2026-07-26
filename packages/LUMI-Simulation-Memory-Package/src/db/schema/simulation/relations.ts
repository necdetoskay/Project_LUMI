import { relations } from "drizzle-orm";
import { simulationRuns } from "./simulation-runs";
import { simulationEvents } from "./simulation-events";
import { simulationCheckpoints } from "./simulation-checkpoints";
import { stateChanges } from "./state-changes";
import { backgroundActions } from "./background-actions";

export const simulationRunsRelations = relations(simulationRuns, ({ many }) => ({
  events: many(simulationEvents),
  checkpoints: many(simulationCheckpoints),
  backgroundActions: many(backgroundActions),
}));

export const simulationEventsRelations = relations(simulationEvents, ({ one, many }) => ({
  run: one(simulationRuns, {
    fields: [simulationEvents.simulationRunId],
    references: [simulationRuns.id],
  }),
  stateChanges: many(stateChanges),
}));
