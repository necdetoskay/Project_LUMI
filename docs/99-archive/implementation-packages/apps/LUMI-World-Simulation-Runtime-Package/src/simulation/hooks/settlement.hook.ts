import type {
  SimulationHook,
  SimulationHookContext,
  SimulationHookResult,
} from "./simulation-hook.types";

export class SettlementSimulationHook
  implements SimulationHook
{
  readonly hookCode = "settlement";

  async execute(
    context: SimulationHookContext,
  ): Promise<SimulationHookResult> {
    return {
      hookCode: this.hookCode,
      events:
        context.intensity >= 0.5
          ? [
              {
                eventType:
                  "settlement.background.activity",
                summary:
                  "Yerleşimde günlük üretim ve sosyal yaşam devam etti.",
                payload: {
                  intensity:
                    context.intensity,
                },
              },
            ]
          : [],
      stateChanges: [],
    };
  }
}
