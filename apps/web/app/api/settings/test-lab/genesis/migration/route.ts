import { NextResponse } from "next/server";

import { getAiDb } from "@lumi/ai/db/client";
import {
  CHARACTER_ONBOARDING_SCENARIO,
  DrizzleTestLabRepository,
  TestLabCoordinator,
  type JsonObject,
} from "@lumi/ai/test-lab";
import {
  auditExistingCharacterGenesis,
  buildExistingCharacterMigrationCandidate,
  createExistingCharacterMigrationPlan,
  createExistingCharacterRollbackManifest,
  validateCharacterGenesisCrossDomain,
  type CharacterGenesisSectionKey,
  type CharacterGenesisSections,
  type ExistingCharacterBackfillProposal,
  type ExistingCharacterCanonicalFact,
  type ExistingCharacterMigrationSnapshot,
} from "@lumi/world";
import { withParent } from "@/lib/auth/with-parent";
import { assertSandboxOwner } from "@/lib/ai/test-lab-sandbox-owner";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";

const PHASE_ID = "character_genesis_existing_character_migration";

export const POST = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const body = (await readRequestBody(request)) as Record<string, unknown>;
    const repository = new DrizzleTestLabRepository(getAiDb());
    const coordinator = new TestLabCoordinator(repository);
    const now = new Date().toISOString();

    try {
      const sessionId = requiredString(body.sessionId, "sessionId");
      const branchId = requiredString(body.branchId, "branchId");
      const parentStateId = requiredString(body.parentStateId, "parentStateId");
      const householdId = requiredString(body.householdId, "householdId");
      const childProfileId = requiredString(
        body.childProfileId,
        "childProfileId",
      );

      const session = await repository.getSession(sessionId);
      if (!session) throw new Error(`TEST_LAB_SESSION_NOT_FOUND:${sessionId}`);
      if (session.scenarioKey !== CHARACTER_ONBOARDING_SCENARIO.key) {
        throw new Error(
          `TEST_LAB_MIGRATION_REQUIRES_CHARACTER_ONBOARDING:${session.scenarioKey}`,
        );
      }

      const parentState = await repository.getState(parentStateId);
      assertSandboxOwner(parentState, {
        parentId: parent.id,
        householdId,
        childProfileId,
      });
      if (!parentState) {
        throw new Error(`TEST_LAB_STATE_NOT_FOUND:${parentStateId}`);
      }

      // #389 qualification intentionally runs only on a sandbox copy. A completed
      // Genesis package from the prior qualification journey is replayed as a mature
      // legacy character: origin/history is pre-existing authority and the remaining
      // layers become constrained backfill proposals. No production repository mutates.
      const genesis = asRecord(parentState.value.characterGenesis);
      const sections = asRecord(genesis.sections) as CharacterGenesisSections;
      if (!sections.origin) {
        throw new Error("TEST_LAB_MIGRATION_REQUIRES_ORIGIN_HISTORY");
      }
      const characterId =
        optionalString(genesis.characterId) ??
        `testlab-character-${childProfileId}`;
      const universeSeed =
        optionalString(genesis.universeSeed) ?? `${sessionId}:universe`;
      const environmentBinding = asRecord(
        asRecord(sections.environment).binding,
      );
      const snapshot: ExistingCharacterMigrationSnapshot = {
        householdId,
        childProfileId,
        characterId,
        universeSeed,
        ...(optionalString(environmentBinding.worldId)
          ? { worldId: optionalString(environmentBinding.worldId) }
          : {}),
        existingSections: { origin: structuredClone(sections.origin) },
        authoritativeFacts: buildAuthoritativeFacts(sections),
      };
      const proposals = buildBackfillProposals(sections, now);
      const audit = auditExistingCharacterGenesis(snapshot);
      const plan = createExistingCharacterMigrationPlan({
        snapshot,
        mode: "explicit_upgrade",
        proposals,
        now,
      });
      const candidate = plan.sandboxApplyAllowed
        ? buildExistingCharacterMigrationCandidate({ snapshot, plan, now })
        : null;
      const expectedWorldId = optionalString(environmentBinding.worldId);
      const expectedRegionId = optionalString(environmentBinding.regionId);
      const expectedHomeId = optionalString(environmentBinding.homeId);
      const validation = candidate
        ? validateCharacterGenesisCrossDomain(candidate, {
            requireCompletePackage: true,
            ...(expectedWorldId ? { expectedWorldId } : {}),
            ...(expectedRegionId ? { expectedRegionId } : {}),
            ...(expectedHomeId ? { expectedHomeId } : {}),
          })
        : null;
      const rollbackPreview = createExistingCharacterRollbackManifest({
        snapshot,
        plan,
        now,
      });
      const afterSections = candidate?.sections ?? snapshot.existingSections ?? {};
      const evidence = toJsonObject({
        qualificationMode: "mature_sandbox_replay",
        audit,
        plan,
        provenance: proposals.map((proposal) => ({
          proposalId: proposal.id,
          section: proposal.section,
          ...proposal.provenance,
        })),
        conflicts: plan.conflicts,
        before: snapshot.existingSections ?? {},
        after: afterSections,
        rollbackPreview,
        validation,
        promotion: {
          automaticPromotionAllowed: false,
          explicitUpgradeAllowed:
            plan.explicitUpgradeAllowed && validation?.valid === true,
        },
        safetyEvidence: {
          canonicalMutationPerformed: false,
          sourceHistoryPreserved: true,
          existingSectionsOverwriteAllowed: false,
          rollbackEvidencePrepared: true,
        },
      });
      const candidateState = toJsonObject({
        ...structuredClone(parentState.value),
        existingCharacterMigrationQualification: evidence,
      });

      const recorded = await coordinator.recordRunCandidates({
        runId: crypto.randomUUID(),
        sessionId,
        branchId,
        phaseId: PHASE_ID,
        parentStateId,
        modelSlug: null,
        pricingSnapshot: null,
        usageSnapshot: null,
        executionSnapshot: {
          productionOperation: "character_genesis.existing_character_migration",
          generationConfig: null,
          promptKey: null,
          promptVersion: null,
          promptTemplateSnapshot: null,
          renderedPrompt: null,
          finalProviderRequest: null,
          rawProviderOutput: null,
          renderedPromptFingerprint: null,
          contextFingerprint: plan.snapshotFingerprint,
        },
        candidates: [
          {
            candidateId: crypto.randomUUID(),
            candidateStateId: crypto.randomUUID(),
            payload: evidence,
            candidateState,
          },
        ],
        now,
      });

      return NextResponse.json({
        data: {
          phaseId: PHASE_ID,
          run: recorded.run,
          candidates: recorded.candidates,
          audit,
          plan,
          validation,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: "TEST_LAB_EXISTING_CHARACTER_MIGRATION_ERROR", message },
        { status: message.includes("FORBIDDEN") ? 403 : 400 },
      );
    }
  });
}, "/api/settings/test-lab/genesis/migration");

function buildBackfillProposals(
  sections: CharacterGenesisSections,
  now: string,
): ExistingCharacterBackfillProposal[] {
  const evidenceRefs =
    sections.origin?.facts.map((fact) => fact.sourceRef ?? fact.id) ?? [];
  const shared = {
    kind: "directly_derived" as const,
    confidence: 0.95,
    evidenceRefs,
    generatedAt: now,
  };
  const proposals: ExistingCharacterBackfillProposal[] = [];
  for (const section of [
    "traits",
    "social",
    "inventory",
    "memoryAndThreads",
    "environment",
  ] as const satisfies readonly CharacterGenesisSectionKey[]) {
    const value = sections[section];
    if (value === undefined) continue;
    proposals.push({
      id: `sandbox-backfill-${section}`,
      section,
      value: structuredClone(value),
      summary: `Replay ${section} from sandbox evidence without rewriting established origin history.`,
      provenance: shared,
      assertions: [],
      ...(section === "social" || section === "inventory"
        ? { reviewedByHuman: true }
        : {}),
    });
  }
  return proposals;
}

function buildAuthoritativeFacts(
  sections: CharacterGenesisSections,
): ExistingCharacterCanonicalFact[] {
  const facts: ExistingCharacterCanonicalFact[] =
    sections.origin?.facts.map((fact) => ({
      path: `origin.fact.${fact.id}`,
      value: fact.summary,
      authority: "story_history",
      sourceRef: fact.sourceRef ?? fact.id,
    })) ?? [];
  const binding = sections.environment?.binding;
  if (binding?.worldId) {
    facts.push({
      path: "environment.binding.worldId",
      value: binding.worldId,
      authority: "world_state",
      sourceRef: binding.worldId,
    });
  }
  if (binding?.regionId) {
    facts.push({
      path: "environment.binding.regionId",
      value: binding.regionId,
      authority: "world_state",
      sourceRef: binding.regionId,
    });
  }
  if (binding?.homeId) {
    facts.push({
      path: "environment.binding.homeId",
      value: binding.homeId,
      authority: "world_state",
      sourceRef: binding.homeId,
    });
  }
  return facts;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`TEST_LAB_REQUIRED_FIELD:${field}`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toJsonObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("TEST_LAB_JSON_OBJECT_REQUIRED");
  }
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}
