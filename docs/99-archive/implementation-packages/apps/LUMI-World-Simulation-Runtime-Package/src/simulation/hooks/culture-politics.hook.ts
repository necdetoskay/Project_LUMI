import type {
  SimulationHook,
  SimulationHookContext,
  SimulationHookResult,
} from "./simulation-hook.types";

export class CulturePoliticsSimulationHook
  implements SimulationHook
{
  readonly hookCode =
    "culture-politics";

  async execute(
    context: SimulationHookContext,
  ): Promise<SimulationHookResult> {
    if (context.intensity < 0.65) {
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
            "culture.community.preparation",
          summary:
            "Topluluk yaklaşan bir etkinlik için hazırlık yaptı.",
          payload: {
            sliceEnd:
              context.sliceEnd.toISOString(),
          },
        },
      ],
      stateChanges: [],
    };
  }
}
