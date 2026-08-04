import { relations } from "drizzle-orm";

import { characterOriginPackages } from "./character-origin-packages";
import { childPreferences } from "./child-preferences";
import { childProfiles } from "./child-profiles";
import { firstRunHandoffConsumptions } from "./first-run-handoff-consumptions";
import { firstRunHandoffs } from "./first-run-handoffs";
import { householdMembers } from "./household-members";
import { households } from "./households";
import { lumiCharacters } from "./lumi-characters";
import { parentalSettings } from "./parental-settings";
import { policyAuditLog } from "./policy-audit-log";

export const householdsRelations = relations(households, ({ many, one }) => ({
  members: many(householdMembers),
  childProfiles: many(childProfiles),
  parentalSettings: one(parentalSettings),
  lumiCharacters: many(lumiCharacters),
  characterOriginPackages: many(characterOriginPackages),
}));

export const householdMembersRelations = relations(
  householdMembers,
  ({ one }) => ({
    household: one(households, {
      fields: [householdMembers.householdId],
      references: [households.id],
    }),
  }),
);

export const childProfilesRelations = relations(
  childProfiles,
  ({ one, many }) => ({
    household: one(households, {
      fields: [childProfiles.householdId],
      references: [households.id],
    }),
    preferences: one(childPreferences),
    handoffs: many(firstRunHandoffs),
    lumiCharacters: many(lumiCharacters),
    characterOriginPackages: many(characterOriginPackages),
    handoffConsumptions: many(firstRunHandoffConsumptions),
  }),
);

export const childPreferencesRelations = relations(
  childPreferences,
  ({ one }) => ({
    childProfile: one(childProfiles, {
      fields: [childPreferences.childProfileId],
      references: [childProfiles.id],
    }),
  }),
);

export const firstRunHandoffsRelations = relations(
  firstRunHandoffs,
  ({ one }) => ({
    childProfile: one(childProfiles, {
      fields: [firstRunHandoffs.childProfileId],
      references: [childProfiles.id],
    }),
    consumption: one(firstRunHandoffConsumptions, {
      fields: [firstRunHandoffs.id],
      references: [firstRunHandoffConsumptions.handoffId],
    }),
  }),
);

export const parentalSettingsRelations = relations(
  parentalSettings,
  ({ one }) => ({
    household: one(households, {
      fields: [parentalSettings.householdId],
      references: [households.id],
    }),
  }),
);

export const policyAuditLogRelations = relations(policyAuditLog, () => ({}));

export const lumiCharactersRelations = relations(lumiCharacters, ({ one }) => ({
  household: one(households, {
    fields: [lumiCharacters.householdId],
    references: [households.id],
  }),
  childProfile: one(childProfiles, {
    fields: [lumiCharacters.childProfileId],
    references: [childProfiles.id],
  }),
  handoffConsumption: one(firstRunHandoffConsumptions, {
    fields: [lumiCharacters.id],
    references: [firstRunHandoffConsumptions.characterId],
  }),
}));

export const characterOriginPackagesRelations = relations(
  characterOriginPackages,
  ({ one }) => ({
    household: one(households, {
      fields: [characterOriginPackages.householdId],
      references: [households.id],
    }),
    childProfile: one(childProfiles, {
      fields: [characterOriginPackages.childProfileId],
      references: [childProfiles.id],
    }),
  }),
);

import { llmProviderSettings } from "./llm-provider-settings";
import { llmTaskModelSettings } from "./llm-task-model-settings";
import { archetypeSuggestionBatches } from "./archetype-suggestion-batches";

export const llmProviderSettingsRelations = relations(
  llmProviderSettings,
  ({ one }) => ({
    household: one(households, {
      fields: [llmProviderSettings.householdId],
      references: [households.id],
    }),
  }),
);

export const llmTaskModelSettingsRelations = relations(
  llmTaskModelSettings,
  ({ one }) => ({
    household: one(households, {
      fields: [llmTaskModelSettings.householdId],
      references: [households.id],
    }),
  }),
);

export const archetypeSuggestionBatchesRelations = relations(
  archetypeSuggestionBatches,
  ({ one }) => ({
    household: one(households, {
      fields: [archetypeSuggestionBatches.householdId],
      references: [households.id],
    }),
    childProfile: one(childProfiles, {
      fields: [archetypeSuggestionBatches.childProfileId],
      references: [childProfiles.id],
    }),
  }),
);

export const firstRunHandoffConsumptionsRelations = relations(
  firstRunHandoffConsumptions,
  ({ one }) => ({
    household: one(households, {
      fields: [firstRunHandoffConsumptions.householdId],
      references: [households.id],
    }),
    childProfile: one(childProfiles, {
      fields: [firstRunHandoffConsumptions.childProfileId],
      references: [childProfiles.id],
    }),
    handoff: one(firstRunHandoffs, {
      fields: [firstRunHandoffConsumptions.handoffId],
      references: [firstRunHandoffs.id],
    }),
    character: one(lumiCharacters, {
      fields: [firstRunHandoffConsumptions.characterId],
      references: [lumiCharacters.id],
    }),
  }),
);
