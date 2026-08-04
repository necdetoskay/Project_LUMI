import { relations } from "drizzle-orm";

import { promptActivationHistory } from "./prompt-activation-history";
import { promptActivations } from "./prompt-activations";
import { promptRegistries } from "./prompt-registries";
import { promptVersions } from "./prompt-versions";

export const promptRegistriesRelations = relations(
  promptRegistries,
  ({ many }) => ({
    versions: many(promptVersions),
    activations: many(promptActivations),
    history: many(promptActivationHistory),
  }),
);

export const promptVersionsRelations = relations(promptVersions, ({ one }) => ({
  registry: one(promptRegistries, {
    fields: [promptVersions.registryId],
    references: [promptRegistries.id],
  }),
}));

export const promptActivationsRelations = relations(
  promptActivations,
  ({ one }) => ({
    registry: one(promptRegistries, {
      fields: [promptActivations.registryId],
      references: [promptRegistries.id],
    }),
    version: one(promptVersions, {
      fields: [promptActivations.activeVersionId],
      references: [promptVersions.id],
    }),
  }),
);

export const promptActivationHistoryRelations = relations(
  promptActivationHistory,
  ({ one }) => ({
    registry: one(promptRegistries, {
      fields: [promptActivationHistory.registryId],
      references: [promptRegistries.id],
    }),
    fromVersion: one(promptVersions, {
      fields: [promptActivationHistory.fromVersionId],
      references: [promptVersions.id],
    }),
    toVersion: one(promptVersions, {
      fields: [promptActivationHistory.toVersionId],
      references: [promptVersions.id],
    }),
  }),
);
