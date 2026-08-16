import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import { encryptApiKey } from "../../../packages/profiles/src/application/llm-settings/encryption";
import {
  chooseCharacterCreationDirection,
  chooseCharacterIdentity,
} from "../../../packages/profiles/src/application/character-creation-cycle.service";
import { generateCharacterFirstIdentitySuggestions } from "../../../packages/profiles/src/application/character-first-identity-suggestion.service";
import {
  chooseCanonicalCharacterType,
  chooseCompatibility,
  chooseCoreSagaSuggestion,
  chooseOriginSuggestion,
  chooseRegionSuggestion,
  chooseUniverse,
  chooseWorldSuggestion,
  generateCompatibilitySuggestions,
  generateCoreSagaSuggestions,
  generateRegionSuggestions,
  generateWorldSuggestions,
} from "../../../packages/profiles/src/application/character-foundation-onboarding.service";
import { generateCharacterOriginSuggestions } from "../../../packages/profiles/src/application/character-origin-suggestion.service";
import { finalizeCharacterOnboarding } from "../lib/character-onboarding/finalize-character-foundation.service";

const url = process.env.STORY_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const enabled =
  process.env.LUMI_ONBOARDING_LIVE_E2E === "1" &&
  process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true" &&
  Boolean(process.env.OPENROUTER_API_KEY) &&
  Boolean(process.env.LUMI_SETTINGS_ENCRYPTION_KEY) &&
  Boolean(url);
const live = enabled ? describe : describe.skip;

live("Character Onboarding 9-stage production Live E2E", () => {
  let pool: pg.Pool;

  beforeAll(() => {
    const databaseName = new URL(url!).pathname.replace(/^\//, "").toLowerCase();
    if (!databaseName.includes("test") && !databaseName.includes("review")) {
      throw new Error(
        `Unsafe DB for destructive Character Onboarding E2E: ${databaseName}. Use a test/review database.`,
      );
    }
    pool = new pg.Pool({ connectionString: url!, max: 4 });
  });

  afterAll(async () => {
    await pool?.end();
  });

  it(
    "uses Context Builder + Prompt Registry + real OpenRouter across all 9 stages and commits the canonical foundation",
    async () => {
      const userId = crypto.randomUUID();
      const householdId = crypto.randomUUID();
      const childProfileId = crypto.randomUUID();
      const providerSettingId = crypto.randomUUID();
      const runMarker = `onboarding-live-${householdId}`;
      const model =
        process.env.LUMI_LIVE_LLM_MODEL ?? "deepseek/deepseek-v4-flash";
      let worldId: string | undefined;
      let characterId: string | undefined;

      const readCycle = async () => {
        const result = await pool.query(
          `SELECT id,status,current_step,latest_summary,completed_at
             FROM profile.character_creation_cycles
            WHERE household_id=$1 AND child_profile_id=$2
            ORDER BY updated_at DESC LIMIT 1`,
          [householdId, childProfileId],
        );
        return result.rows[0] as
          | {
              id: string;
              status: string;
              current_step: string;
              latest_summary: Record<string, unknown>;
              completed_at: Date | null;
            }
          | undefined;
      };

      try {
        await pool.query(
          `INSERT INTO profile.households(id,name,slug)
           VALUES($1,'Character Onboarding Live E2E',$2)`,
          [householdId, runMarker],
        );
        await pool.query(
          `INSERT INTO profile.household_members
            (household_id,user_id,membership_role,is_active)
           VALUES($1,$2,'owner',true)`,
          [householdId, userId],
        );
        await pool.query(
          `INSERT INTO profile.child_profiles
            (id,household_id,display_name,age_band,locale,metadata)
           VALUES($1,$2,'Lumi Kaşif','6-8','tr-TR',$3::jsonb)`,
          [
            childProfileId,
            householdId,
            JSON.stringify({
              e2eRun: runMarker,
              interests: ["space", "animals", "science"],
              customInterests: ["kristal mağaralar", "yıldız haritaları"],
              developmentGoals: ["problem_solving", "empathy"],
            }),
          ],
        );
        await pool.query(
          `INSERT INTO profile.parental_settings
            (household_id,content_boundary,require_parent_approval_for_ai)
           VALUES($1,'strict',false)`,
          [householdId],
        );
        await pool.query(
          `INSERT INTO profile.llm_provider_settings
            (id,user_id,household_id,provider,encrypted_api_key,enabled)
           VALUES($1,$2,$3,'openrouter',$4,true)`,
          [
            providerSettingId,
            userId,
            householdId,
            encryptApiKey(process.env.OPENROUTER_API_KEY!),
          ],
        );

        const tasks = [
          "character_identity_suggestions",
          "character_world_suggestions",
          "character_world_compatibility",
          "character_region_suggestions",
          "character_origin_suggestions",
          "character_core_saga",
        ];
        for (const task of tasks) {
          await pool.query(
            `INSERT INTO profile.llm_task_model_settings
              (id,user_id,household_id,provider,task_type,model_id,reasoning_level,
               temperature,max_output_tokens,enabled)
             VALUES($1,$2,$3,'openrouter',$4,$5,'low',0.55,2200,true)`,
            [crypto.randomUUID(), userId, householdId, task, model],
          );
        }

        await chooseCharacterCreationDirection(userId, {
          householdId,
          childProfileId,
          direction: "character_first",
        });

        // Stage 1 — Character Type
        await chooseCanonicalCharacterType(userId, {
          householdId,
          childProfileId,
          characterType: "fantastic",
        });
        expect((await readCycle())?.current_step).toBe("character_identity");

        // Stage 2 — Character Identity Candidates
        const identities = await generateCharacterFirstIdentitySuggestions(userId, {
          householdId,
          childProfileId,
        });
        expect(identities.suggestions.length).toBe(4);
        const identity = identities.suggestions[0]!;
        await chooseCharacterIdentity(userId, {
          householdId,
          childProfileId,
          suggestion: identity,
        });
        expect((await readCycle())?.current_step).toBe("universe");

        // Stage 3 — Universe
        const universe = {
          key: `e2e-universe-${householdId.slice(0, 8)}`,
          name: "Işık İzleri Evreni",
        };
        await chooseUniverse(userId, { householdId, childProfileId, universe });
        expect((await readCycle())?.current_step).toBe("world");

        // Stage 4 — World
        const worlds = await generateWorldSuggestions(userId, {
          householdId,
          childProfileId,
        });
        expect(worlds.suggestions.length).toBe(4);
        const world = worlds.suggestions[0]!;
        await chooseWorldSuggestion(userId, {
          householdId,
          childProfileId,
          suggestion: world,
        });
        expect((await readCycle())?.current_step).toBe("compatibility");

        // Stage 5 — World ↔ Character Compatibility
        const compatibilityResult = await generateCompatibilitySuggestions(userId, {
          householdId,
          childProfileId,
        });
        expect(compatibilityResult.suggestions.length).toBe(1);
        const compatibility = compatibilityResult.suggestions[0]!;
        expect([
          "natural",
          "requires_explanation",
          "low",
          "incompatible",
        ]).toContain(compatibility.classification);
        expect(compatibility.classification).not.toBe("incompatible");
        await chooseCompatibility(userId, {
          householdId,
          childProfileId,
          suggestion: compatibility,
        });
        expect((await readCycle())?.current_step).toBe("region");

        // Stage 6 — Region
        const regions = await generateRegionSuggestions(userId, {
          householdId,
          childProfileId,
        });
        expect(regions.suggestions.length).toBe(4);
        const region = regions.suggestions[0]!;
        await chooseRegionSuggestion(userId, {
          householdId,
          childProfileId,
          suggestion: region,
        });
        expect((await readCycle())?.current_step).toBe("origin");

        // Stage 7 — Origin
        const origins = await generateCharacterOriginSuggestions(userId, {
          householdId,
          childProfileId,
        });
        expect(origins.suggestions.length).toBeGreaterThan(0);
        const origin = origins.suggestions[0]!;
        await chooseOriginSuggestion(userId, {
          householdId,
          childProfileId,
          suggestion: origin,
        });
        expect((await readCycle())?.current_step).toBe("core_saga");

        // Stage 8 — Core Saga
        const sagas = await generateCoreSagaSuggestions(userId, {
          householdId,
          childProfileId,
        });
        expect(sagas.suggestions.length).toBe(4);
        const coreSaga = sagas.suggestions[0]!;
        await chooseCoreSagaSuggestion(userId, {
          householdId,
          childProfileId,
          suggestion: coreSaga,
        });
        expect((await readCycle())?.current_step).toBe("final_review");

        // Stage 9 — Final Review / Commit
        const finalized = await finalizeCharacterOnboarding(userId, {
          householdId,
          childProfileId,
        });
        characterId = finalized.characterId;
        worldId = finalized.world.worldId;

        const completed = await pool.query(
          `SELECT status,current_step,completed_at,latest_summary
             FROM profile.character_creation_cycles
            WHERE id=$1`,
          [finalized.cycleId],
        );
        expect(completed.rows[0]?.status).toBe("completed");
        expect(completed.rows[0]?.current_step).toBe("completed");
        expect(completed.rows[0]?.completed_at).toBeTruthy();

        const persistedCharacter = await pool.query(
          `SELECT name,broad_kind,origin_concept,starting_region_archetype,
                  home_archetype,first_mystery_seed,universe_seed
             FROM profile.lumi_characters WHERE id=$1`,
          [characterId],
        );
        expect(persistedCharacter.rowCount).toBe(1);
        expect(persistedCharacter.rows[0]?.name).toBe(identity.name);
        expect(persistedCharacter.rows[0]?.starting_region_archetype).toBe(
          region.name,
        );
        expect(persistedCharacter.rows[0]?.universe_seed).toBe(universe.key);

        const persistedSaga = await pool.query(
          `SELECT need_type,description,status
             FROM profile.character_goals
            WHERE character_id=$1 AND need_type='core_saga'`,
          [characterId],
        );
        expect(persistedSaga.rowCount).toBe(1);
        expect(persistedSaga.rows[0]?.description).toContain(coreSaga.title);

        const persistedWorld = await pool.query(
          `SELECT universe_seed,accepted_candidate_seed
             FROM profile.worlds WHERE id=$1`,
          [worldId],
        );
        expect(persistedWorld.rows[0]?.universe_seed).toBe(universe.key);
        expect(persistedWorld.rows[0]?.accepted_candidate_seed).toBe(world.key);

        const persistedRegion = await pool.query(
          `SELECT display_name FROM profile.world_regions WHERE id=$1`,
          [finalized.world.regionId],
        );
        expect(persistedRegion.rows[0]?.display_name).toBe(region.name);
        expect(
          (
            await pool.query(
              `SELECT 1 FROM profile.world_homes WHERE id=$1`,
              [finalized.world.homeId],
            )
          ).rowCount,
        ).toBe(1);
        expect(
          (
            await pool.query(
              `SELECT 1 FROM profile.world_checkpoints WHERE id=$1`,
              [finalized.world.checkpointId],
            )
          ).rowCount,
        ).toBe(1);

        const selectionRows = await pool.query(
          `SELECT step_key FROM profile.character_creation_selections
            WHERE cycle_id=$1 ORDER BY created_at ASC`,
          [finalized.cycleId],
        );
        const canonicalSteps = [
          "character_type",
          "character_identity",
          "universe",
          "world",
          "compatibility",
          "region",
          "origin",
          "core_saga",
          "final_review",
        ];
        for (const step of canonicalSteps)
          expect(selectionRows.rows.some((row) => row.step_key === step)).toBe(true);

        const traces = await pool.query(
          `SELECT task_type,prompt_key,prompt_version,provider,model_id,
                  prompt_tokens,completion_tokens,total_tokens,latency_ms,input_context
             FROM profile.ai_generation_traces
            WHERE creation_cycle_id=$1
            ORDER BY created_at ASC`,
          [finalized.cycleId],
        );
        const generatedTasks = new Set(traces.rows.map((row) => row.task_type));
        for (const task of tasks) expect(generatedTasks.has(task)).toBe(true);
        expect(
          traces.rows.every((row) => row.provider === "openrouter"),
        ).toBe(true);
        expect(
          traces.rows.every((row) => Number(row.total_tokens ?? 0) > 0),
        ).toBe(true);

        const traceJson = JSON.stringify(traces.rows.map((row) => row.input_context));
        expect(traceJson).toContain("kristal mağaralar");
        expect(traceJson).toContain(world.name);
        expect(traceJson).toContain(region.name);
        expect(traceJson).not.toContain("storySessionId");
        expect(traceJson).not.toContain("relevant_memories");

        console.log(
          "LUMI_ONBOARDING_LIVE_RESULT",
          JSON.stringify(
            {
              stages: "9/9",
              model,
              character: {
                name: identity.name,
                identity: identity.identity,
                traits: identity.traits,
              },
              world,
              compatibility,
              region,
              origin,
              coreSaga,
              persistence: {
                character: true,
                world: true,
                region: true,
                home: true,
                coreSaga: true,
                cycleCompleted: true,
              },
              generationTraces: traces.rows.map((row) => ({
                taskType: row.task_type,
                promptKey: row.prompt_key,
                promptVersion: row.prompt_version,
                modelId: row.model_id,
                promptTokens: row.prompt_tokens,
                completionTokens: row.completion_tokens,
                totalTokens: row.total_tokens,
                latencyMs: row.latency_ms,
              })),
            },
            null,
            2,
          ),
        );
      } finally {
        if (worldId) {
          const worldTables = [
            "world_event_store",
            "world_character_movement_events",
            "world_character_locations",
            "world_character_residences",
            "world_location_connections",
            "world_environment_snapshots",
            "world_bootstrap_manifests",
            "world_checkpoints",
            "world_homes",
            "world_locations",
            "world_regions",
          ];
          for (const table of worldTables) {
            try {
              await pool.query(`DELETE FROM profile.${table} WHERE world_id=$1`, [
                worldId,
              ]);
            } catch {
              // Schema versions may not contain every optional continuity table.
            }
          }
          await pool.query(`DELETE FROM profile.worlds WHERE id=$1`, [worldId]);
        }
        if (characterId) {
          await pool.query(`DELETE FROM profile.character_goals WHERE character_id=$1`, [
            characterId,
          ]);
          await pool.query(`DELETE FROM profile.lumi_characters WHERE id=$1`, [
            characterId,
          ]);
        }
        try {
          await pool.query(
            `DELETE FROM profile.ai_generation_traces WHERE household_id=$1`,
            [householdId],
          );
        } catch {}
        await pool.query(
          `DELETE FROM profile.character_creation_selections WHERE household_id=$1`,
          [householdId],
        );
        await pool.query(
          `DELETE FROM profile.character_creation_cycles WHERE household_id=$1`,
          [householdId],
        );
        await pool.query(
          `DELETE FROM profile.llm_task_model_settings WHERE household_id=$1`,
          [householdId],
        );
        await pool.query(
          `DELETE FROM profile.llm_provider_settings WHERE household_id=$1`,
          [householdId],
        );
        await pool.query(
          `DELETE FROM profile.parental_settings WHERE household_id=$1`,
          [householdId],
        );
        await pool.query(`DELETE FROM profile.child_profiles WHERE id=$1`, [
          childProfileId,
        ]);
        await pool.query(
          `DELETE FROM profile.household_members WHERE household_id=$1`,
          [householdId],
        );
        await pool.query(`DELETE FROM profile.households WHERE id=$1`, [
          householdId,
        ]);
      }
    },
    240_000,
  );
});
