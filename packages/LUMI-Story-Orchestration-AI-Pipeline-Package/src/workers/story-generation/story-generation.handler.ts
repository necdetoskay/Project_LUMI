import type { OutboxEventHandler } from "../outbox/outbox-worker";
import type { StoryGenerationOrchestrator } from "../../story-generation/orchestrator/story-generation.orchestrator";

export function createStoryGenerationHandler(
  orchestrator: StoryGenerationOrchestrator,
): OutboxEventHandler {
  return async (event) => {
    const generationRequestId = String(
      event.payload.generationRequestId,
    );

    await orchestrator.execute(
      generationRequestId,
    );
  };
}
