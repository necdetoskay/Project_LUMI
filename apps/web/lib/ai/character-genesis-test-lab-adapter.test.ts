import { describe, expect, it } from "vitest";

import type { JsonObject } from "@lumi/ai/test-lab";
import {
  CHARACTER_GENESIS_SANDBOX_STATE_KEY,
  stageCharacterGenesisSandboxCandidate,
} from "./character-genesis-test-lab-adapter";

function packageInput() {
  return {
    householdId: "household-1",
    childProfileId: "child-1",
    characterId: "character-1",
    universeSeed: "universe-seed",
    candidateSeed: "candidate-seed",
    provenance: {
      schemaRevision: "character-genesis.v1",
      seed: "candidate-seed",
      generatedAt: "2026-08-19T15:00:00.000Z",
    },
    sections: {
      origin: {
        summary: "Miro has a life before the first story.",
        narrative: "Miro grew up near the old bridge.",
        facts: [
          {
            id: "fact-friend",
            kind: "relationship",
            summary: "Lina is Miro's friend.",
            visibility: "known_to_character" as const,
          },
        ],
      },
      social: {
        npcs: [
          {
            candidateId: "npc-lina",
            role: "friend",
            displayName: "Lina",
            originFactIds: ["fact-friend"],
          },
        ],
        relationships: [
          {
            fromCandidateId: "character-1",
            toCandidateId: "npc-lina",
            trust: 0.8,
            affection: 0.8,
            familiarity: 0.9,
            respect: 0.7,
            tension: 0.1,
            dependence: 0.2,
          },
        ],
      },
    },
  };
}

describe("character genesis Test Lab sandbox adapter", () => {
  it("stages the package inside a new sandbox state without mutating its parent", () => {
    const parentState: JsonObject = {
      characterType: { key: "human" },
      marker: "keep-me",
    };
    const before = structuredClone(parentState);

    const result = stageCharacterGenesisSandboxCandidate({
      parentState,
      packageInput: packageInput(),
    });

    expect(parentState).toEqual(before);
    expect(result.candidate.status).toBe("staged");
    expect(result.validation.valid).toBe(true);
    expect(result.candidateState.marker).toBe("keep-me");
    expect(result.candidateState[CHARACTER_GENESIS_SANDBOX_STATE_KEY]).toEqual(
      result.payload,
    );
    expect(result.payload.status).toBe("staged");
  });

  it("keeps invalid candidates inspectable while reporting validation errors", () => {
    const input = packageInput();
    input.sections.social.relationships[0]!.toCandidateId = "npc-missing";

    const result = stageCharacterGenesisSandboxCandidate({
      parentState: {},
      packageInput: input,
    });

    expect(result.candidate.status).toBe("staged");
    expect(result.validation.valid).toBe(false);
    expect(result.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "GENESIS_RELATIONSHIP_TO_MISSING" }),
      ]),
    );
  });
});
