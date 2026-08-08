import { describe, expect, it } from "vitest";
import {
  createChildProfile,
  createHousehold,
  findChildProfileForUser,
} from "../../src/application";
import { createScenario } from "../../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../../tooling/ultef/src/artifacts.mjs";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe("ULTEF L1-PROFILE-001 — profile household isolation", () => {
  it("creates a real household/profile and rejects access from a non-member", async () => {
    const scenario = createScenario({
      id: "L1-PROFILE-001",
      title: "Profile household isolation",
      level: "L1",
      projectGate: "PX-LUMI-06",
      seed: "runtime-uuid",
    });

    if (!hasDatabase) {
      scenario.event(
        "prerequisite.missing",
        "Profiles integration database is not configured; scenario did not execute.",
      );
      const report = scenario.finish({
        result: "BLOCKED",
        blockedBy: "DATABASE_URL",
        reason: "A real profiles integration database is required.",
      });
      await writeScenarioArtifacts(report, { environment: "integration" });
      throw new Error(
        "ULTEF L1-PROFILE-001 BLOCKED: DATABASE_URL is not configured",
      );
    }

    const ownerUserId = crypto.randomUUID();
    const outsiderUserId = crypto.randomUUID();
    const suffix = crypto.randomUUID().slice(0, 8);

    scenario.setup("Owner user", ownerUserId);
    scenario.setup("Outsider user", outsiderUserId);

    try {
      const household = await createHousehold(ownerUserId, {
        name: `ULTEF Household ${suffix}`,
        slug: `ultef-${suffix}`,
      });
      scenario.setup("Household", {
        id: household.id,
        name: household.name,
        slug: household.slug,
      });
      scenario.event(
        "household.created",
        `Household '${household.name}' was created for the owner user.`,
        { householdId: household.id },
      );

      const child = await createChildProfile(ownerUserId, {
        householdId: household.id,
        displayName: `ULTEF Child ${suffix}`,
        ageBand: "6-8",
      });
      scenario.setup("Child profile", {
        id: child.id,
        displayName: child.displayName,
        ageBand: child.ageBand,
        householdId: child.householdId,
      });
      scenario.event(
        "child-profile.created",
        `Child profile '${child.displayName}' was created inside '${household.name}'.`,
        { childProfileId: child.id, householdId: child.householdId },
      );

      const ownerRead = await findChildProfileForUser(
        child.id,
        ownerUserId,
        household.id,
      );
      scenario.event(
        "child-profile.read.owner",
        `Owner user successfully read child profile '${child.displayName}'.`,
        { found: Boolean(ownerRead) },
      );
      scenario.assert(
        "Created child belongs to the created household",
        child.householdId === household.id,
        household.id,
        child.householdId,
      );
      scenario.assert(
        "Owner can read the created child profile",
        ownerRead?.id === child.id,
        child.id,
        ownerRead?.id ?? null,
      );

      let outsiderRejected = false;
      let outsiderError = "";
      try {
        await findChildProfileForUser(child.id, outsiderUserId, household.id);
      } catch (error) {
        outsiderRejected = true;
        outsiderError = error instanceof Error ? error.message : String(error);
      }
      scenario.event(
        "child-profile.read.outsider",
        outsiderRejected
          ? `Outsider access was rejected: ${outsiderError}`
          : "Outsider unexpectedly gained access to the child profile.",
        { rejected: outsiderRejected },
      );
      scenario.assert(
        "Non-member cannot read child profile from another household",
        outsiderRejected,
        true,
        outsiderRejected,
      );

      scenario.delta(
        "household.childProfiles.count",
        0,
        1,
        "child profile creation",
      );

      const allPassed =
        outsiderRejected &&
        ownerRead?.id === child.id &&
        child.householdId === household.id;
      const report = scenario.finish({
        result: allPassed ? "PASS" : "FAIL",
        reason: allPassed
          ? "Profile creation and household isolation behaved as expected."
          : "One or more profile ownership assertions failed.",
      });
      await writeScenarioArtifacts(report, { environment: "integration" });

      expect(report.result).toBe("PASS");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("ULTEF L1-PROFILE-001 BLOCKED")
      ) {
        throw error;
      }

      scenario.event(
        "scenario.error",
        `Scenario execution failed before successful completion: ${error instanceof Error ? error.message : String(error)}`,
      );
      const report = scenario.finish({
        result: "FAIL",
        reason: error instanceof Error ? error.message : String(error),
      });
      await writeScenarioArtifacts(report, { environment: "integration" });
      throw error;
    }
  });
});
