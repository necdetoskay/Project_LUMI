import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { observeHandler } from "@/lib/observability/observed-api-route";
import {
  findChildProfileForUser,
  getHouseholdForUser,
  listCharactersByChildProfile,
} from "@lumi/profiles/application";
import {
  getCharacterCurrentLocation,
  getWorldDetail,
  getWorldForCharacter,
} from "@lumi/world/application";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

function regionLabel(discoveryStatus: string, displayName: string): string {
  if (discoveryStatus === "discovered" || discoveryStatus === "explored") {
    return displayName;
  }

  if (discoveryStatus === "rumored") {
    return "Uzakta duyulan bir bolge";
  }

  return "Kesfedilmemis bolge";
}

function regionSummary(discoveryStatus: string): string {
  if (discoveryStatus === "explored") {
    return "Bu bolge daha once ayrintili sekilde kesfedildi.";
  }

  if (discoveryStatus === "discovered") {
    return "Bu bolge artik haritada gorunuyor.";
  }

  if (discoveryStatus === "rumored") {
    return "Bu bolge hakkinda yalnizca hafif izler var.";
  }

  return "Bu bolgenin ayrintilari henuz acilmadi.";
}

function accessibilityHint(status: string): string {
  switch (status) {
    case "restricted":
      return "Biraz daha hazirlik gerekebilir.";
    case "blocked":
      return "Bu yol su anda acik degil.";
    case "dangerous":
      return "Bu alan su anda guvenli gorunmuyor.";
    case "open":
    default:
      return "Kesfe acik gorunuyor.";
  }
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export const GET = observeHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    return withParent(async (parent) => {
      const { searchParams } = new URL(request.url);
      const householdId = searchParams.get("householdId");
      const requestedCharacterId = searchParams.get("characterId");

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

        const characters = await listCharactersByChildProfile(
          parent.id,
          householdId,
          parsedParams.data.id,
        );

        const primaryCharacter = requestedCharacterId
          ? characters.find((character) => character.id === requestedCharacterId) ?? null
          : characters[0] ?? null;

        if (requestedCharacterId && !primaryCharacter) {
          return NextResponse.json(
            {
              error: "NOT_FOUND",
              message: "Character not found for this child profile",
            },
            { status: 404 },
          );
        }

        if (!primaryCharacter) {
          return NextResponse.json({ world: null, character: null });
        }

        const world = await getWorldForCharacter(primaryCharacter.id);
        if (!world) {
          return NextResponse.json({ world: null, character: primaryCharacter });
        }

        const [detailResult, currentLocationResult] = await Promise.allSettled([
          getWorldDetail(world.id),
          getCharacterCurrentLocation(primaryCharacter.id),
        ]);

        const detail = detailResult.status === "fulfilled" ? detailResult.value : null;
        const currentLocation =
          currentLocationResult.status === "fulfilled" &&
          currentLocationResult.value &&
          typeof currentLocationResult.value === "object"
            ? currentLocationResult.value
            : null;

        const detailRegions = asArray(detail?.regions);
        const detailLocations = asArray(detail?.locations);
        const locationsByRegion = new Map<string, Array<(typeof detailLocations)[number]>>();
        for (const location of detailLocations) {
          if (!location?.regionId) {
            continue;
          }
          const existing = locationsByRegion.get(location.regionId) ?? [];
          existing.push(location);
          locationsByRegion.set(location.regionId, existing);
        }

        const mapRegions = detailRegions.map((region) => {
          const regionLocations = locationsByRegion.get(region.id) ?? [];
          const canRevealLocations =
            region.discoveryStatus === "discovered" ||
            region.discoveryStatus === "explored";

          return {
            id: region.id,
            regionKey: region.regionKey,
            displayName: regionLabel(region.discoveryStatus, region.displayName),
            regionType: canRevealLocations ? region.regionType : "unknown",
            accessibilityStatus: region.accessibilityStatus,
            discoveryStatus: region.discoveryStatus,
            summary: regionSummary(region.discoveryStatus),
            isCurrentRegion: currentLocation?.regionId === region.id,
            locations: canRevealLocations
              ? regionLocations.map((location) => ({
                  id: location.id,
                  locationKey: location.locationKey,
                  displayName: location.displayName,
                  locationType: location.locationType,
                  accessibilityStatus: location.accessibilityStatus,
                  accessibilityHint: accessibilityHint(location.accessibilityStatus),
                  isHome: location.isHome,
                  isCurrent: currentLocation?.id === location.id,
                  safetyLevel: location.safetyLevel ?? "unknown",
                }))
              : [],
          };
        });

        return NextResponse.json({
          character: {
            id: primaryCharacter.id,
            name: primaryCharacter.name,
            characterType: primaryCharacter.characterType,
            subtype: primaryCharacter.subtype,
          },
          world: {
            id: world.id,
            childProfileId: world.childProfileId,
            characterId: world.characterId,
            lifecycleStatus: world.lifecycleStatus,
            currentLocation: currentLocation
              ? {
                  id: currentLocation.id,
                  regionId: currentLocation.regionId,
                  displayName: currentLocation.displayName,
                  locationType: currentLocation.locationType,
                }
              : null,
            homeLocationId: detail?.home?.locationId ?? null,
            latestCheckpointId: detail?.latestCheckpoint?.id ?? null,
            regions: mapRegions,
          },
        });
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

        console.error("[world-map-route]", err);
        return NextResponse.json(
          {
            error: "INTERNAL_ERROR",
            message:
              process.env.NODE_ENV === "production"
                ? "Failed to load world map"
                : message,
          },
          { status: 500 },
        );
      }
    });
  },
  "/api/child-profiles/{id}/world",
);
