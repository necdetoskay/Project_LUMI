import { relations } from "drizzle-orm";
import { storyDefinitions } from "./story-definitions";
import { storyVersions } from "./story-versions";
import { storyScenes } from "./story-scenes";
import { storySceneTransitions } from "./story-scene-transitions";
import { storySessions } from "./story-sessions";
import { storySessionCharacters } from "./story-session-characters";
import { storySessionSceneVisits } from "./story-session-visits";
import { storySessionCheckpoints } from "./story-session-checkpoints";
import { storyEventStore } from "./story-event-store";
import { storyIdempotencyLedger } from "./story-idempotency-ledger";
import { storyParentNotes } from "./story-parent-notes";
import { storyCommitRecords } from "./story-commit-records";
import { storyOutbox } from "./story-outbox";

export const storyDefinitionsRelations = relations(
  storyDefinitions,
  ({ many }) => ({
    versions: many(storyVersions),
    sessions: many(storySessions),
  }),
);

export const storyVersionsRelations = relations(storyVersions, ({ many }) => ({
  scenes: many(storyScenes),
  transitions: many(storySceneTransitions),
  sessions: many(storySessions),
}));

export const storyScenesRelations = relations(storyScenes, () => ({}));
export const storySceneTransitionsRelations = relations(
  storySceneTransitions,
  () => ({}),
);
export const storySessionsRelations = relations(storySessions, ({ many }) => ({
  characters: many(storySessionCharacters),
  visits: many(storySessionSceneVisits),
  checkpoints: many(storySessionCheckpoints),
  events: many(storyEventStore),
  notes: many(storyParentNotes),
  idempotency: many(storyIdempotencyLedger),
  commits: many(storyCommitRecords),
  outbox: many(storyOutbox),
}));

export const storySessionCharactersRelations = relations(
  storySessionCharacters,
  () => ({}),
);
export const storySessionSceneVisitsRelations = relations(
  storySessionSceneVisits,
  () => ({}),
);
export const storySessionCheckpointsRelations = relations(
  storySessionCheckpoints,
  () => ({}),
);
export const storyEventStoreRelations = relations(storyEventStore, () => ({}));
export const storyIdempotencyLedgerRelations = relations(
  storyIdempotencyLedger,
  () => ({}),
);
export const storyParentNotesRelations = relations(
  storyParentNotes,
  () => ({}),
);
