import { relations } from "drizzle-orm";

import { childPreferences } from "./child-preferences";
import { childProfiles } from "./child-profiles";
import { firstRunHandoffs } from "./first-run-handoffs";
import { householdMembers } from "./household-members";
import { households } from "./households";
import { parentalSettings } from "./parental-settings";
import { policyAuditLog } from "./policy-audit-log";

export const householdsRelations = relations(households, ({ many, one }) => ({
  members: many(householdMembers),
  childProfiles: many(childProfiles),
  parentalSettings: one(parentalSettings),
}));

export const householdMembersRelations = relations(householdMembers, ({ one }) => ({
  household: one(households, {
    fields: [householdMembers.householdId],
    references: [households.id],
  }),
}));

export const childProfilesRelations = relations(childProfiles, ({ one, many }) => ({
  household: one(households, {
    fields: [childProfiles.householdId],
    references: [households.id],
  }),
  preferences: one(childPreferences),
  handoffs: many(firstRunHandoffs),
}));

export const childPreferencesRelations = relations(childPreferences, ({ one }) => ({
  childProfile: one(childProfiles, {
    fields: [childPreferences.childProfileId],
    references: [childProfiles.id],
  }),
}));

export const firstRunHandoffsRelations = relations(firstRunHandoffs, ({ one }) => ({
  childProfile: one(childProfiles, {
    fields: [firstRunHandoffs.childProfileId],
    references: [childProfiles.id],
  }),
}));

export const parentalSettingsRelations = relations(parentalSettings, ({ one }) => ({
  household: one(households, {
    fields: [parentalSettings.householdId],
    references: [households.id],
  }),
}));

export const policyAuditLogRelations = relations(policyAuditLog, () => ({}));
