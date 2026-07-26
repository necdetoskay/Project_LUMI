import { relations } from "drizzle-orm";

import { users } from "../identity/users";
import { childInterests } from "./child-interests";
import { childPreferences } from "./child-preferences";
import { childProfiles } from "./child-profiles";
import { householdMembers } from "./household-members";
import { households } from "./households";
import { parentalSettings } from "./parental-settings";

export const householdsRelations = relations(
  households,
  ({ many, one }) => ({
    members: many(householdMembers),
    childProfiles: many(childProfiles),
    parentalSettings: one(parentalSettings),
  }),
);

export const householdMembersRelations = relations(
  householdMembers,
  ({ one }) => ({
    household: one(households, {
      fields: [householdMembers.householdId],
      references: [households.id],
    }),
    user: one(users, {
      fields: [householdMembers.userId],
      references: [users.id],
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
    interests: many(childInterests),
  }),
);
