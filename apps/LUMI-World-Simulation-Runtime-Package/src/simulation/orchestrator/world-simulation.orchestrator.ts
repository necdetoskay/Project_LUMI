import { desc, eq } from "drizzle-orm";
import {
  characterConditions,
  characterGoals,
  characters,
  simulationCheckpoints,
  simulationPolicies,
  simulationRuns,
} from "../../db/schema";
import {
  withSerializableTransaction,
  withTransaction,
} from "../../db/transaction";
import { DrizzleAuditRepository } from "../../db/repositories/audit/drizzle-audit.repository";
import { DrizzleOutboxRepository } from "../../db/repositories/system/drizzle-outbox.repository";
import { calculateCatchUpWindow } from "../time/catch-up-window";
import { buildSimulationSlices } from "../time/build-simulation-slices";
import { selectRelevantEntities } from "../relevance/entity-relevance.service";
import { chooseNpcIntent } from "../npc/evaluate-intents";
import { executeRoutine } from "../npc/routine-executor";
import type { SimulationHook } from "../hooks/simulation-hook.types";
import { persistSimulationSlice } from "../persistence/persist-simulation-slice";

export class WorldSimulationOrchestrator {
  constructor(
    private readonly hooks: SimulationHook[],
    private readonly random: () => number =
      Math.random,
  ) {}

  async execute(
    worldId: string,
    now = new Date(),
  ): Promise<{
    runId: string;
    simulatedDays: number;
    frozen: boolean;
  }> {
    const bootstrap =
      await withSerializableTransaction(
        async (tx) => {
          const [policy] = await tx
            .select()
            .from(simulationPolicies)
            .where(
              eq(
                simulationPolicies.worldId,
                worldId,
              ),
            )
            .limit(1);

          if (!policy) {
            throw new Error(
              "Simulation policy not found",
            );
          }

          const [checkpoint] = await tx
            .select()
            .from(simulationCheckpoints)
            .where(
              eq(
                simulationCheckpoints.worldId,
                worldId,
              ),
            )
            .orderBy(
              desc(
                simulationCheckpoints.simulatedUntil,
              ),
            )
            .limit(1);

          const lastSimulatedAt =
            checkpoint?.simulatedUntil ??
            now;

          const window =
            calculateCatchUpWindow({
              lastSimulatedAt,
              now,
              maxCatchUpDays:
                policy.maxCatchUpDays,
              freezeAfterLimit:
                policy.freezeAfterLimit,
            });

          const [run] = await tx
            .insert(simulationRuns)
            .values({
              worldId,
              status: "running",
              startedAt: now,
              fromTime:
                window.from,
              targetTime:
                window.simulatedUntil,
              elapsedDays:
                window.elapsedDays,
              simulatedDays:
                window.simulatedDays,
              frozen:
                window.frozen,
            })
            .returning();

          if (!run) {
            throw new Error(
              "Simulation run could not be created",
            );
          }

          return {
            policy,
            window,
            run,
          };
        },
      );

    const slices =
      buildSimulationSlices({
        from: bootstrap.window.from,
        simulatedDays:
          bootstrap.window.simulatedDays,
        fullIntensityDays:
          bootstrap.policy
            .fullIntensityDays,
        minimumIntensity:
          Number(
            bootstrap.policy
              .minimumIntensity,
          ),
        maxCatchUpDays:
          bootstrap.policy
            .maxCatchUpDays,
      });

    for (const slice of slices) {
      const entityRows =
        await withTransaction(
          async (tx) => {
            const characterRows =
              await tx
                .select()
                .from(characters)
                .where(
                  eq(
                    characters.worldId,
                    worldId,
                  ),
                );

            const goalRows =
              await tx
                .select()
                .from(characterGoals);

            const conditionRows =
              await tx
                .select()
                .from(
                  characterConditions,
                );

            return {
              characters:
                characterRows,
              goals: goalRows,
              conditions:
                conditionRows,
            };
          },
        );

      const relevant =
        selectRelevantEntities(
          entityRows.characters.map(
            (character) => ({
              entityId:
                character.id,
              entityType:
                "character",
              proximityScore:
                character.currentLocationId
                  ? 0.8
                  : 0.2,
              unresolvedGoalScore:
                entityRows.goals.some(
                  (goal) =>
                    goal.characterId ===
                      character.id &&
                    goal.status ===
                      "active",
                )
                  ? 0.9
                  : 0.2,
              activeConditionScore:
                entityRows.conditions.some(
                  (condition) =>
                    condition.characterId ===
                    character.id,
                )
                  ? 0.8
                  : 0.1,
              relationshipScore: 0.5,
              recentInteractionScore:
                0.4,
              timeSensitivityScore:
                slice.intensity,
            }),
          ),
          {
            threshold:
              0.35,
            maxEntities:
              Math.max(
                5,
                Math.ceil(
                  30 *
                    slice.intensity,
                ),
              ),
          },
        );

      const actions = [];

      for (const entity of relevant) {
        const character =
          entityRows.characters.find(
            (item) =>
              item.id ===
              entity.entityId,
          );

        if (!character) continue;

        const chosen =
          chooseNpcIntent(
            [
              {
                intentType:
                  "routine",
                baseUtility: 0.6,
                urgency: 0.3,
                emotionalAlignment:
                  0.5,
                goalAlignment:
                  0.4,
                relationshipAlignment:
                  0.3,
                environmentalFit:
                  0.7,
                novelty: 0.2,
                risk: 0.1,
              },
              {
                intentType:
                  "social",
                baseUtility: 0.45,
                urgency: 0.2,
                emotionalAlignment:
                  0.6,
                goalAlignment:
                  0.3,
                relationshipAlignment:
                  0.7,
                environmentalFit:
                  0.5,
                novelty: 0.5,
                risk: 0.15,
              },
              {
                intentType:
                  "rumor",
                baseUtility: 0.3,
                urgency: 0.4,
                emotionalAlignment:
                  0.4,
                goalAlignment:
                  0.5,
                relationshipAlignment:
                  0.6,
                environmentalFit:
                  0.4,
                novelty: 0.9,
                risk: 0.2,
              },
            ],
            {
              minimumUtility:
                0.25,
              random:
                this.random,
            },
          );

        if (!chosen) continue;

        const result =
          await executeRoutine({
            characterId:
              character.id,
            routineType:
              chosen.intentType,
            locationId:
              character.currentLocationId ??
              undefined,
            intensity:
              slice.intensity,
            metadata: {
              utility:
                chosen.utility,
            },
          });

        actions.push({
          characterId:
            character.id,
          actionType:
            result.actionType,
          payload: {
            utility:
              chosen.utility,
            success:
              result.success,
          },
          memory:
            result.generatedMemory,
          stateChanges:
            result.stateChanges,
        });
      }

      const hookResults = [];

      for (const hook of this.hooks) {
        hookResults.push(
          await hook.execute({
            worldId,
            sliceStart:
              slice.sliceStart,
            sliceEnd:
              slice.sliceEnd,
            intensity:
              slice.intensity,
          }),
        );
      }

      await withTransaction(
        async (tx) => {
          await persistSimulationSlice(
            tx,
            {
              simulationRunId:
                bootstrap.run.id,
              worldId,
              sliceStart:
                slice.sliceStart,
              sliceEnd:
                slice.sliceEnd,
              events:
                hookResults.flatMap(
                  (result) =>
                    result.events,
                ),
              actions:
                actions.map(
                  (action) => ({
                    characterId:
                      action.characterId,
                    actionType:
                      action.actionType,
                    payload:
                      action.payload,
                    memory:
                      action.memory,
                  }),
                ),
              changes: [
                ...actions.flatMap(
                  (action) =>
                    action.stateChanges,
                ),
                ...hookResults.flatMap(
                  (result) =>
                    result.stateChanges,
                ),
              ],
            },
          );
        },
      );
    }

    await withTransaction(
      async (tx) => {
        await tx
          .insert(
            simulationCheckpoints,
          )
          .values({
            worldId,
            simulationRunId:
              bootstrap.run.id,
            simulatedUntil:
              bootstrap.window
                .simulatedUntil,
            snapshot: {
              simulatedDays:
                bootstrap.window
                  .simulatedDays,
              frozen:
                bootstrap.window
                  .frozen,
            },
          });

        await tx
          .update(simulationRuns)
          .set({
            status:
              "completed",
            completedAt:
              new Date(),
          })
          .where(
            eq(
              simulationRuns.id,
              bootstrap.run.id,
            ),
          );

        const auditRepository =
          new DrizzleAuditRepository(
            tx,
          );
        const outboxRepository =
          new DrizzleOutboxRepository(
            tx,
          );

        await auditRepository.append({
          actorType: "system",
          action:
            "simulation.run.completed",
          entityType:
            "simulation_run",
          entityId:
            bootstrap.run.id,
          afterState: {
            worldId,
            simulatedDays:
              bootstrap.window
                .simulatedDays,
            frozen:
              bootstrap.window
                .frozen,
          },
        });

        await outboxRepository.enqueue({
          aggregateType: "world",
          aggregateId: worldId,
          eventType:
            "world.simulation.completed",
          payload: {
            worldId,
            simulationRunId:
              bootstrap.run.id,
            simulatedDays:
              bootstrap.window
                .simulatedDays,
            frozen:
              bootstrap.window
                .frozen,
          },
        });
      },
    );

    return {
      runId:
        bootstrap.run.id,
      simulatedDays:
        bootstrap.window
          .simulatedDays,
      frozen:
        bootstrap.window
          .frozen,
    };
  }
}
