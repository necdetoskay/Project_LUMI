import { relations } from "drizzle-orm";
import { stories } from "./stories";
import { storyVersions } from "./story-versions";
import { storyNodes } from "./story-nodes";
import { storyChoices } from "./story-choices";
import { storySessions } from "./story-sessions";
import { storyParticipants } from "./story-participants";
import { sessionDecisions } from "./session-decisions";
import { storyOutcomes } from "./story-outcomes";
import { storyEvents } from "./story-events";

export const storiesRelations = relations(stories, ({ many }) => ({
  versions: many(storyVersions),
}));

export const storyVersionsRelations = relations(storyVersions, ({ one, many }) => ({
  story: one(stories, {
    fields: [storyVersions.storyId],
    references: [stories.id],
  }),
  nodes: many(storyNodes),
  sessions: many(storySessions),
}));

export const storyNodesRelations = relations(storyNodes, ({ one, many }) => ({
  version: one(storyVersions, {
    fields: [storyNodes.storyVersionId],
    references: [storyVersions.id],
  }),
  choices: many(storyChoices),
}));

export const storySessionsRelations = relations(storySessions, ({ one, many }) => ({
  version: one(storyVersions, {
    fields: [storySessions.storyVersionId],
    references: [storyVersions.id],
  }),
  participants: many(storyParticipants),
  decisions: many(sessionDecisions),
  outcome: one(storyOutcomes),
  events: many(storyEvents),
}));
