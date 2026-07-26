import { executeIdempotently } from "../system/execute-idempotently.use-case";
import { createLumiFoundation, type CreateLumiFoundationInput } from "./create-lumi-foundation.use-case";

export async function createLumiFoundationIdempotent(input: {
  idempotencyKey: string;
  payload: CreateLumiFoundationInput;
}) {
  return executeIdempotently({
    scope: "lumi.foundation.create",
    key: input.idempotencyKey,
    requestPayload: input.payload,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    operation: async () => {
      const result = await createLumiFoundation(input.payload);

      return {
        responseCode: 201,
        responseBody: {
          userId: result.user.id,
          householdId: result.household.id,
          childProfileId: result.child.id,
          universeId: result.universe.id,
          worldId: result.world.id,
          regionId: result.region.id,
          locationId: result.location.id,
          characterId: result.character.id,
          inventoryId: result.inventory.id,
        },
      };
    },
  });
}
