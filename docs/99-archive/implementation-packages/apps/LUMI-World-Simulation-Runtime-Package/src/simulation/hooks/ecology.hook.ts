import type {
  SimulationHook,
  SimulationHookContext,
  SimulationHookResult,
} from "./simulation-hook.types";

export class EcologySimulationHook
  implements SimulationHook
{
  readonly hookCode = "ecology";

  async execute(
    context: SimulationHookContext,
  ): Promise<SimulationHookResult> {
    if (context.intensity < 0.2) {
      return {
        hookCode: this.hookCode,
        events: [],
        stateChanges: [],
      };
    }

    return {
      hookCode: this.hookCode,
      events: [
        {
          eventType:
            "ecology.background.tick",
          summary:
            "Bölgedeki doğal yaşam kendi döngüsünde ilerledi.",
          payload: {
            intensity:
              context.intensity,
          },
        },
      ],
      stateChanges: [],
    };
  }
}
