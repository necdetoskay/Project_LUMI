import type { ProductionScenarioAdapter } from "@lumi/ai/test-lab";

import { characterOnboardingProductionScenarioAdapter } from "./character-onboarding-test-lab-adapter";
import { storyProductionScenarioAdapter } from "./story-test-lab-adapter";

export const testLabProductionScenarioAdapter: ProductionScenarioAdapter = {
  execute(request) {
    if (request.scenarioKey === "character_onboarding") {
      return characterOnboardingProductionScenarioAdapter.execute(request);
    }
    if (request.scenarioKey === "story_generation") {
      return storyProductionScenarioAdapter.execute(request);
    }
    throw new Error(`TEST_LAB_UNSUPPORTED_SCENARIO:${request.scenarioKey}`);
  },
};
