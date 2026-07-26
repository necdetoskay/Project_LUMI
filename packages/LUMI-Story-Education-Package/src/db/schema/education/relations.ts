import { relations } from "drizzle-orm";
import { questions } from "./questions";
import { answers } from "./answers";
import { storyVersions } from "../story/story-versions";

export const questionsRelations = relations(questions, ({ one, many }) => ({
  storyVersion: one(storyVersions, {
    fields: [questions.storyVersionId],
    references: [storyVersions.id],
  }),
  answers: many(answers),
}));
