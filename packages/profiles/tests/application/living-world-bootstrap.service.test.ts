import { describe, expect, it } from "vitest";

import {
  LivingWorldBootstrapService,
  planLivingWorldBootstrap,
  type LivingWorldBootstrapManifestStore,
  type LivingWorldBootstrapMaterializer,
} from "../../src/application/living-world-bootstrap.service";
import type {
  CharacterFoundationRecord,
  GenesisArchetype,
  LivingWorldBootstrapManifest,
} from "../../src/domain/character-genesis";

const NOW = new Date("2026-08-17T09:00:00.000Z");

function foundation(archetypes: GenesisArchetype[]): CharacterFoundationRecord {
  const characterId = `character-${archetypes.join("-")}`;
  const sagaCanonId = `saga-${characterId}`;
  return {
    id: `foundation-${characterId}`,
    householdId: "household-1",
    childProfileId: "child-1",
    characterId,
    worldId: "world-1",
    version: 1,
    genesis: {
      id: `genesis-${characterId}`,
      householdId: "household-1",
      childProfileId: "child-1",
      characterId,
      worldId: "world-1",
      version: 1,
      archetypes,
      premise: "A character begins life in an unfamiliar but coherent local world.",
      currentSituation: "The opening situation needs only relationships that make it feel real.",
      longTermDesire: "Find a meaningful place in the world.",
      fundamentalNeed: "Build trust without losing curiosity.",
      knownFacts: ["The starting region is real and reachable."],
      currentBeliefs: ["Local relationships may help."],
      unknownQuestions: ["Who can be trusted first?"],
      socialEcology: [],
      provenance: provenance("character_genesis"),
    },
    sagaCanon: {
      id: sagaCanonId,
      householdId: "household-1",
      childProfileId: "child-1",
      characterId,
      worldId: "world-1",
      version: 1,
      centralQuestion: "Where does this character truly belong?",
      deepTruth: "The oldest local promise was made for someone else.",
      longTermDesire: "Find a meaningful place in the world.",
      fundamentalFear: "Belonging may require becoming someone else.",
      stakes: "The character could lose the chance to build an authentic home.",
      hiddenForces: [],
      possibleTransformations: ["Learn reciprocal belonging."],
      revealLayers: [
        {
          id: "reveal-1",
          order: 1,
          label: "First pattern",
          reveal: "Several local details share the same symbol.",
          prerequisites: ["One trusted local relationship"],
        },
      ],
      forbiddenEarlyReveals: ["The oldest local promise was made for someone else."],
      provenance: provenance("saga_foundation"),
    },
    sagaProgression: {
      sagaCanonId,
      version: 1,
      knownFacts: ["The starting region is real and reachable."],
      currentBeliefs: ["Local relationships may help."],
      revealedClues: [],
      falseLeads: [],
      unresolvedQuestions: ["Who can be trusted first?"],
      revealStage: 0,
      updatedAt: NOW,
    },
    bootstrapManifest: {
      id: `bootstrap-${characterId}`,
      householdId: "household-1",
      childProfileId: "child-1",
      characterId,
      worldId: "world-1",
      foundationVersion: 1,
      bootstrapVersion: 1,
      idempotencyKey: `bootstrap-run-${characterId}`,
      status: "pending",
      materialized: [],
      createdAt: NOW,
      updatedAt: NOW,
    },
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function provenance(intent: string) {
  return {
    generationIntent: intent,
    promptKey: `test.${intent}`,
    promptVersion: 1,
    model: "test/model",
    provider: "test",
    generatedAt: NOW,
  };
}

function roleTypes(archetype: GenesisArchetype): string[] {
  return planLivingWorldBootstrap(foundation([archetype])).roles.map(
    (entry) => entry.role.roleType,
  );
}

describe("living world bootstrap", () => {
  it("produces structurally different ecologies for rooted, lost, hatched and created origins", () => {
    const rooted = roleTypes("rooted");
    const lost = roleTypes("lost");
    const hatched = roleTypes("hatched");
    const created = roleTypes("created");

    expect(new Set([rooted.join(","), lost.join(","), hatched.join(","), created.join(",")]).size).toBe(4);
    expect(rooted).toEqual(expect.arrayContaining(["community_member", "friend"]));
    expect(lost).toEqual(expect.arrayContaining(["rescuer", "first_neutral_contact"]));
    expect(hatched).toEqual(expect.arrayContaining(["local_guardian", "symbiotic_creature"]));
    expect(created).toEqual(expect.arrayContaining(["creator", "facility_ai"]));
  });

  it("does not force human family stereotypes onto sparse origins", () => {
    for (const archetype of ["hatched", "awakened", "lost"] as const) {
      const roles = roleTypes(archetype);
      expect(roles).not.toContain("family");
      expect(roles).not.toContain("sibling");
      expect(roles).not.toContain("caregiver");
    }
  });

  it("honours explicit social ecology instead of inventing filler roles", () => {
    const input = foundation(["rooted"]);
    input.genesis.socialEcology = [
      {
        id: "role-signal",
        roleType: "distant_kin_signal",
        label: "Distant signal",
        purpose: "A sparse non-local connection is all the opening needs.",
        required: true,
      },
    ];

    const plan = planLivingWorldBootstrap(input);
    expect(plan.roles).toHaveLength(1);
    expect(plan.roles[0]?.role.id).toBe("role-signal");
  });

  it("records canonical NPC, relationship and local-context materialization refs", async () => {
    const input = foundation(["lost"]);
    const saved: LivingWorldBootstrapManifest[] = [];
    const materializer: LivingWorldBootstrapMaterializer = {
      async resolveLocalContext() {
        return [
          {
            kind: "location_fact",
            authority: "world.locations",
            entityId: "location-1",
            reused: true,
          },
        ];
      },
      async ensureNpc({ plan }) {
        return {
          npcId: `npc-${plan.role.roleType}`,
          npcReused: false,
          relationshipEntityId: `${input.characterId}:npc-${plan.role.roleType}`,
          relationshipReused: false,
        };
      },
    };
    const store: LivingWorldBootstrapManifestStore = {
      async save(_foundation, manifest) {
        saved.push({ ...manifest, materialized: [...manifest.materialized] });
      },
    };

    const result = await new LivingWorldBootstrapService(
      materializer,
      store,
      () => NOW,
    ).run(input);

    expect(result.status).toBe("completed");
    expect(result.manifest.materialized).toContainEqual(
      expect.objectContaining({
        kind: "npc",
        authority: "profile.lumi_characters",
      }),
    );
    expect(result.manifest.materialized).toContainEqual(
      expect.objectContaining({
        kind: "relationship",
        authority: "profile.character_relationships",
      }),
    );
    expect(result.manifest.materialized).toContainEqual(
      expect.objectContaining({
        kind: "location_fact",
        authority: "world.locations",
      }),
    );
    expect(saved.at(-1)?.status).toBe("completed");
  });

  it("does no materialization work when a completed manifest is retried", async () => {
    const input = foundation(["created"]);
    input.bootstrapManifest = {
      ...input.bootstrapManifest!,
      status: "completed",
      materialized: [
        {
          kind: "npc",
          authority: "profile.lumi_characters",
          entityId: "npc-existing",
          genesisRoleId: "role-existing",
          reused: false,
        },
      ],
    };
    let calls = 0;
    const materializer: LivingWorldBootstrapMaterializer = {
      async resolveLocalContext() {
        calls += 1;
        return [];
      },
      async ensureNpc() {
        calls += 1;
        throw new Error("should-not-run");
      },
    };
    const store: LivingWorldBootstrapManifestStore = {
      async save() {
        calls += 1;
      },
    };

    const result = await new LivingWorldBootstrapService(materializer, store).run(input);
    expect(result.status).toBe("completed");
    expect(calls).toBe(0);
  });

  it("persists failed status after a partial bootstrap without mutating the committed foundation", async () => {
    const input = foundation(["lost"]);
    const originalGenesis = structuredClone(input.genesis);
    const saved: LivingWorldBootstrapManifest[] = [];
    let calls = 0;
    const materializer: LivingWorldBootstrapMaterializer = {
      async resolveLocalContext() {
        return [];
      },
      async ensureNpc({ plan }) {
        calls += 1;
        if (calls === 2) throw new Error("NPC_RUNTIME_UNAVAILABLE");
        return {
          npcId: `npc-${plan.role.roleType}`,
          npcReused: false,
          relationshipEntityId: `${input.characterId}:npc-${plan.role.roleType}`,
          relationshipReused: false,
        };
      },
    };
    const store: LivingWorldBootstrapManifestStore = {
      async save(_foundation, manifest) {
        saved.push({ ...manifest, materialized: [...manifest.materialized] });
      },
    };

    await expect(
      new LivingWorldBootstrapService(materializer, store, () => NOW).run(input),
    ).rejects.toThrow("NPC_RUNTIME_UNAVAILABLE");
    expect(saved.at(-1)?.status).toBe("failed");
    expect(saved.at(-1)?.failureCode).toBe("NPC_RUNTIME_UNAVAILABLE");
    expect(saved.at(-1)?.materialized.some((ref) => ref.kind === "npc")).toBe(true);
    expect(input.genesis).toEqual(originalGenesis);
  });
});
