import { eq } from "drizzle-orm";
import { getAuthContext } from "@/api/auth/get-auth-context";
import { requireWorldAccess } from "@/api/auth/policies";
import { apiErrorResponse } from "@/api/http/errors";
import { createRequestId } from "@/api/http/request-id";
import { apiSuccess } from "@/api/http/respond";
import {
  characters,
  childProfiles,
  inventories,
  locations,
  regions,
  universes,
  worlds,
} from "@/db/schema";
import { withTransaction } from "@/db/transaction";

export async function GET(
  _request: Request,
  context: { params: Promise<{ worldId: string }> },
) {
  const fallbackRequestId = createRequestId();

  try {
    const authContext = await getAuthContext();
    const { worldId } = await context.params;

    const result = await withTransaction(async (tx) => {
      await requireWorldAccess(
        tx,
        authContext,
        worldId,
      );

      const [world] = await tx
        .select()
        .from(worlds)
        .where(eq(worlds.id, worldId))
        .limit(1);

      if (!world) {
        const error = new Error("World not found") as Error & {
          code: string;
          status: number;
        };
        error.code = "WORLD_NOT_FOUND";
        error.status = 404;
        throw error;
      }

      const [universe] = await tx
        .select()
        .from(universes)
        .where(eq(universes.id, world.universeId))
        .limit(1);

      const [region] = await tx
        .select()
        .from(regions)
        .where(eq(regions.worldId, world.id))
        .limit(1);

      const [location] = region
        ? await tx
            .select()
            .from(locations)
            .where(eq(locations.regionId, region.id))
            .limit(1)
        : [];

      const [character] = await tx
        .select()
        .from(characters)
        .where(eq(characters.worldId, world.id))
        .limit(1);

      const [child] = character?.childProfileId
        ? await tx
            .select()
            .from(childProfiles)
            .where(eq(childProfiles.id, character.childProfileId))
            .limit(1)
        : [];

      const [inventory] = character
        ? await tx
            .select()
            .from(inventories)
            .where(eq(inventories.ownerCharacterId, character.id))
            .limit(1)
        : [];

      return {
        child,
        universe,
        world,
        region,
        location,
        character,
        inventory,
      };
    });

    return apiSuccess(
      result,
      authContext.requestId,
    );
  } catch (error) {
    return apiErrorResponse(error, fallbackRequestId);
  }
}
