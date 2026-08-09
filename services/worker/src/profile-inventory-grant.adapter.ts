import {
  STORY_REWARD_SYSTEM_AUTHORITY,
  grantStoryRewardAsSystem,
} from "../../../packages/profiles/src/application/index.ts";
import type {
  InventoryGrantInput,
  InventoryGrantPort,
  InventoryGrantResult,
} from "@lumi/world/application";

export class ProfileInventoryGrantAdapter implements InventoryGrantPort {
  async grant(input: InventoryGrantInput): Promise<InventoryGrantResult> {
    const result = await grantStoryRewardAsSystem({
      authority: STORY_REWARD_SYSTEM_AUTHORITY,
      householdId: input.householdId,
      childProfileId: input.childProfileId,
      itemDefinitionKey: input.reward.itemDefinitionKey,
      quantity: input.reward.quantity,
      idempotencyKey: input.idempotencyKey,
      sourceQuestId: input.sourceQuestId,
    });
    return { granted: result.granted };
  }
}
