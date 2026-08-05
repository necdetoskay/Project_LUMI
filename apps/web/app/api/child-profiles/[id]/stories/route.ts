import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { observeHandler } from "@/lib/observability/observed-api-route";
import {
  findChildProfileForUser,
  getHouseholdForUser,
  listCharactersByChildProfile,
  listInventory,
} from "@lumi/profiles/application";
import {
  ensureStarterStoriesForHousehold,
  listSessionsForChildProfile,
} from "@lumi/story/application";
import {
  getCharacterCurrentLocation,
  getWorldDetail,
  getWorldForCharacter,
} from "@lumi/world/application";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

function getWorldLabel(world: { id: string; metadata?: unknown }): string {
  const metadata =
    world.metadata && typeof world.metadata === "object"
      ? (world.metadata as Record<string, unknown>)
      : null;

  return typeof metadata?.name === "string"
    ? metadata.name
    : `World ${world.id.slice(0, 8)}`;
}

function formatLifecycleLabel(status: string): string {
  switch (status) {
    case "active":
      return "Dunya aktif ve kesfe hazir.";
    case "archived":
      return "Bu dunya su anda arsivlenmis gorunuyor.";
    default:
      return `Dunya durumu: ${status}`;
  }
}

export const GET = observeHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    return withParent(async (parent) => {
      const { searchParams } = new URL(request.url);
      const householdId = searchParams.get("householdId");

      if (!householdId) {
        return NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            message: "householdId query parameter is required",
          },
          { status: 400 },
        );
      }

      const parsedParams = paramsSchema.safeParse(await params);
      if (!parsedParams.success) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: parsedParams.error.message },
          { status: 400 },
        );
      }

      try {
        const household = await getHouseholdForUser(householdId, parent.id);
        if (!household) {
          return NextResponse.json(
            {
              error: "FORBIDDEN",
              message: "User does not have access to this household",
            },
            { status: 403 },
          );
        }

        const childProfile = await findChildProfileForUser(
          parsedParams.data.id,
          parent.id,
          householdId,
        );
        if (!childProfile) {
          return NextResponse.json(
            { error: "NOT_FOUND", message: "Child profile not found" },
            { status: 404 },
          );
        }

        const [sessions, catalog, characters] = await Promise.all([
          listSessionsForChildProfile(householdId, parsedParams.data.id),
          ensureStarterStoriesForHousehold(householdId),
          listCharactersByChildProfile(
            parent.id,
            householdId,
            parsedParams.data.id,
          ),
        ]);

        const launchOptions = await Promise.all(
          characters.map(async (character) => {
            const inventoryPromise = Promise.resolve(
              listInventory(parent.id, householdId, "character", character.id),
            ).catch(() => []);

            try {
              const world = await getWorldForCharacter(character.id);
              if (!world) {
                const inventory = await inventoryPromise;
                const inventoryItems = Array.isArray(inventory)
                  ? inventory
                  : [];
                return {
                  character,
                  world: null,
                  storySources: inventoryItems.slice(0, 2).map((item) => ({
                    id: `inventory:${item.id}`,
                    kind: "inventory",
                    title: item.displayName,
                    summary: `${item.category} esyasi hikaye icin bir ipucu olabilir.`,
                    detail: `${item.rarity} | adet ${item.quantity}`,
                  })),
                };
              }

              const [detailResult, currentLocationResult, inventory] =
                await Promise.allSettled([
                  getWorldDetail(world.id),
                  getCharacterCurrentLocation(character.id),
                  inventoryPromise,
                ]);

              const detail =
                detailResult.status === "fulfilled" ? detailResult.value : null;
              const currentLocation =
                currentLocationResult.status === "fulfilled"
                  ? currentLocationResult.value
                  : null;
              const inventoryItems =
                inventory.status === "fulfilled" &&
                Array.isArray(inventory.value)
                  ? inventory.value
                  : [];

              const worldSources = [
                {
                  id: `world:${world.id}`,
                  kind: "world_state",
                  title: currentLocation?.displayName ?? getWorldLabel(world),
                  summary: currentLocation
                    ? `${currentLocation.displayName} cevresinde yeni bir hikaye baslayabilir.`
                    : formatLifecycleLabel(world.lifecycleStatus),
                  detail: detail?.latestCheckpoint
                    ? `Son dunya checkpoint'i hazir: #${detail.latestCheckpoint.checkpointSequence}`
                    : formatLifecycleLabel(world.lifecycleStatus),
                },
                {
                  id: `origin:${character.id}`,
                  kind: "origin",
                  title: character.startingLocation ?? "Ilk iz",
                  summary:
                    character.originConcept ??
                    "Karakterin cikis fikrinden ilerleyen bir baslangic.",
                  detail: character.homeArchetype
                    ? `Yuva izi: ${character.homeArchetype}`
                    : `${character.characterType} / ${character.subtype}`,
                },
                ...inventoryItems.slice(0, 2).map((item) => ({
                  id: `inventory:${item.id}`,
                  kind: "inventory",
                  title: item.displayName,
                  summary: `${item.category} esyasi hikaye icin dogrudan bir hareket noktasi sunuyor.`,
                  detail: `${item.rarity} | adet ${item.quantity}`,
                })),
              ];

              return {
                character,
                world: {
                  id: world.id,
                  lifecycleStatus: world.lifecycleStatus,
                  label: getWorldLabel(world),
                },
                storySources: worldSources,
              };
            } catch {
              const inventory = await inventoryPromise;
              const inventoryItems = Array.isArray(inventory) ? inventory : [];
              return {
                character,
                world: null,
                storySources: inventoryItems.slice(0, 2).map((item) => ({
                  id: `inventory:${item.id}`,
                  kind: "inventory",
                  title: item.displayName,
                  summary: `${item.category} esyasi hikaye icin bir ipucu olabilir.`,
                  detail: `${item.rarity} | adet ${item.quantity}`,
                })),
              };
            }
          }),
        );

        return NextResponse.json({ sessions, catalog, launchOptions });
      } catch (error) {
        const err = error as Error & { code?: string };
        const message = err.message ?? "Unknown error";

        if (err.name === "AuthorizationError" || err.code === "FORBIDDEN") {
          return NextResponse.json(
            { error: "FORBIDDEN", message },
            { status: 403 },
          );
        }

        if (err.name === "NotFoundError" || err.code === "NOT_FOUND") {
          return NextResponse.json(
            { error: "NOT_FOUND", message },
            { status: 404 },
          );
        }

        console.error("[stories-route]", err);
        return NextResponse.json(
          {
            error: "INTERNAL_ERROR",
            message:
              process.env.NODE_ENV === "production"
                ? "Failed to load stories"
                : message,
          },
          { status: 500 },
        );
      }
    });
  },
  "/api/child-profiles/{id}/stories",
);
