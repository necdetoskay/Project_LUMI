import type { StoryOutboxRecord } from "../db/schema/story";
import type { IndirectEffectApplicator } from "./indirect-effect-propagator.service";

export const HOOK_DELIVERY_INTENT_TYPE = "story_hook_delivery";

/**
 * Applies `story_hook_delivery` outbox intents produced when a story hook is
 * created (S27-T04). Validates the intent type and payload and returns a
 * success count. The concrete hook->scene handoff is the Story Reader's job
 * (S16); this applicator is the idempotent delivery marker through the
 * existing outbox/propagator infrastructure (S23).
 */
export class StoryHookDeliveryApplicator implements IndirectEffectApplicator {
  async apply(intent: StoryOutboxRecord): Promise<{ writes: number }> {
    if (intent.intentType !== HOOK_DELIVERY_INTENT_TYPE) {
      return { writes: 0 };
    }

    const payload = intent.payload as {
      hookId?: string;
      opportunityId?: string;
      hookType?: string;
      sceneType?: string;
      storySessionId?: string;
    };

    if (!payload.hookId || !payload.opportunityId || !payload.storySessionId) {
      return { writes: 0 };
    }

    return { writes: 1 };
  }
}