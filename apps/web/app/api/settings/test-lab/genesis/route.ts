import { NextResponse } from "next/server";

import { getAiDb } from "@lumi/ai/db/client";
import {
  CHARACTER_ONBOARDING_SCENARIO,
  DrizzleTestLabRepository,
  TestLabCoordinator,
} from "@lumi/ai/test-lab";
import type {
  CharacterGenesisSections,
  GenesisProvenance,
} from "@lumi/world";
import { withParent } from "@/lib/auth/with-parent";
import {
  CHARACTER_GENESIS_TEST_LAB_PHASE_ID,
  stageCharacterGenesisSandboxCandidate,
} from "@/lib/ai/character-genesis-test-lab-adapter";
import { assertSandboxOwner } from "@/lib/ai/test-lab-sandbox-owner";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const POST = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const body = (await readRequestBody(request)) as Record<string, unknown>;
    const now = new Date().toISOString();
    const repository = new DrizzleTestLabRepository(getAiDb());
    const coordinator = new TestLabCoordinator(repository);

    try {
      const sessionId = requiredString(body.sessionId, "sessionId");
      const branchId = requiredString(body.branchId, "branchId");
      const parentStateId = requiredString(body.parentStateId, "parentStateId");
      const householdId = requiredString(body.householdId, "householdId");
      const childProfileId = requiredString(
        body.childProfileId,
        "childProfileId",
      );
      const characterId = requiredString(body.characterId, "characterId");
      const universeSeed = requiredString(body.universeSeed, "universeSeed");
      const candidateSeed = requiredString(body.candidateSeed, "candidateSeed");

      const session = await repository.getSession(sessionId);
      if (!session) throw new Error(`TEST_LAB_SESSION_NOT_FOUND:${sessionId}`);
      if (session.scenarioKey !== CHARACTER_ONBOARDING_SCENARIO.key) {
        throw new Error(
          `TEST_LAB_GENESIS_REQUIRES_CHARACTER_ONBOARDING:${session.scenarioKey}`,
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

      const staged = stageCharacterGenesisSandboxCandidate({
        parentState: parentState.value,
        packageInput: {
          householdId,
          childProfileId,
          characterId,
          universeSeed,
          candidateSeed,
          provenance: readProvenance(body.provenance, candidateSeed, now),
          sections: readSections(body.sections),
          now,
        },
      });

      const runId = crypto.randomUUID();
      const candidateStateId = crypto.randomUUID();
      const recorded = await coordinator.recordCandidate({
        runId,
        candidateId: staged.candidate.id,
        candidateStateId,
        sessionId,
        branchId,
        phaseId: CHARACTER_GENESIS_TEST_LAB_PHASE_ID,
        parentStateId,
        candidateState: staged.candidateState,
        candidatePayload: staged.payload,
        now,
      });

      return NextResponse.json({
        data: {
          candidate: staged.candidate,
          validation: staged.validation,
          run: recorded.run,
          candidateStateId: recorded.candidateState.id,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = message.includes("FORBIDDEN") ? 403 : 400;
      return NextResponse.json(
        { error: "TEST_LAB_GENESIS_ERROR", message },
        { status },
      );
    }
  });
}, "/api/settings/test-lab/genesis");

function readProvenance(
  value: unknown,
  candidateSeed: string,
  now: string,
): GenesisProvenance {
  const record = optionalRecord(value, "provenance");
  return {
    schemaRevision: optionalString(record.schemaRevision) ?? "character-genesis.v1",
    seed: optionalString(record.seed) ?? candidateSeed,
    generatedAt: optionalString(record.generatedAt) ?? now,
    ...(optionalString(record.modelProvider)
      ? { modelProvider: optionalString(record.modelProvider) }
      : {}),
    ...(optionalString(record.modelId)
      ? { modelId: optionalString(record.modelId) }
      : {}),
    ...(optionalString(record.promptRevision)
      ? { promptRevision: optionalString(record.promptRevision) }
      : {}),
    ...(optionalString(record.generationConfigRevision)
      ? {
          generationConfigRevision: optionalString(
            record.generationConfigRevision,
          ),
        }
      : {}),
    ...(optionalString(record.parserRevision)
      ? { parserRevision: optionalString(record.parserRevision) }
      : {}),
    ...(optionalString(record.derivationRevision)
      ? { derivationRevision: optionalString(record.derivationRevision) }
      : {}),
    ...(optionalString(record.validationRevision)
      ? { validationRevision: optionalString(record.validationRevision) }
      : {}),
  } as GenesisProvenance;
}

function readSections(value: unknown): CharacterGenesisSections {
  if (value === undefined || value === null) return {};
  return optionalRecord(value, "sections") as CharacterGenesisSections;
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

function optionalRecord(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`TEST_LAB_JSON_OBJECT_REQUIRED:${field}`);
  }
  return value as Record<string, unknown>;
}
