import { relations } from "drizzle-orm";
import { featureFlags } from "./feature-flags";
import { featureFlagOverrides } from "./feature-flag-overrides";
import { jobs } from "./jobs";
import { jobAttempts } from "./job-attempts";

export const featureFlagsRelations = relations(featureFlags, ({ many }) => ({
  overrides: many(featureFlagOverrides),
}));

export const jobsRelations = relations(jobs, ({ many }) => ({
  attempts: many(jobAttempts),
}));
