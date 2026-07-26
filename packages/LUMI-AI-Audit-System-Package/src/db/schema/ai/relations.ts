import { relations } from "drizzle-orm";
import { aiProviders } from "./providers";
import { aiModels } from "./models";
import { promptTemplates } from "./prompt-templates";
import { promptTemplateVersions } from "./prompt-template-versions";
import { generationRequests } from "./generation-requests";
import { generationAttempts } from "./generation-attempts";
import { tokenUsage } from "./token-usage";
import { costRecords } from "./cost-records";
import { safetyReviews } from "./safety-reviews";

export const aiProvidersRelations = relations(aiProviders, ({ many }) => ({
  models: many(aiModels),
}));

export const promptTemplatesRelations = relations(promptTemplates, ({ many }) => ({
  versions: many(promptTemplateVersions),
}));

export const generationRequestsRelations = relations(generationRequests, ({ many }) => ({
  attempts: many(generationAttempts),
  safetyReviews: many(safetyReviews),
}));

export const generationAttemptsRelations = relations(generationAttempts, ({ one, many }) => ({
  request: one(generationRequests, {
    fields: [generationAttempts.generationRequestId],
    references: [generationRequests.id],
  }),
  tokenUsage: one(tokenUsage),
  costs: many(costRecords),
}));
