import type { JsonObject } from "@lumi/ai/test-lab";
import {
  createCharacterGenesisPackage,
  validateCharacterGenesisStructure,
  type CharacterGenesisPackage,
  type CreateCharacterGenesisPackageInput,
  type GenesisValidationResult,
} from "@lumi/world";

export const CHARACTER_GENESIS_TEST_LAB_PHASE_ID = "character_genesis";
export const CHARACTER_GENESIS_SANDBOX_STATE_KEY = "characterGenesis";

export interface CharacterGenesisSandboxStageResult {
  candidate: CharacterGenesisPackage;
  candidateState: JsonObject;
  payload: JsonObject;
  validation: GenesisValidationResult;
}

export function stageCharacterGenesisSandboxCandidate(input: {
  parentState: JsonObject;
  packageInput: CreateCharacterGenesisPackageInput;
}): CharacterGenesisSandboxStageResult {
  const candidate = createCharacterGenesisPackage(input.packageInput);
  const validation = validateCharacterGenesisStructure(candidate);
  const payload = toJsonObject(candidate);
  const parentState = structuredClone(input.parentState);

  return {
    candidate,
    payload,
    validation,
    candidateState: {
      ...parentState,
      [CHARACTER_GENESIS_SANDBOX_STATE_KEY]: payload,
    },
  };
}

function toJsonObject(value: unknown): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("TEST_LAB_JSON_OBJECT_REQUIRED");
  }
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}
