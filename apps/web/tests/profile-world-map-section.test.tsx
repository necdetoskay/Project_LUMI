import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProfileWorldMapSection } from "@/components/world/profile-world-map-section";

function jsonResponse(body: unknown, ok = true, status?: number): Response {
  return new Response(JSON.stringify(body), {
    status: status ?? (ok ? 200 : 500),
    headers: { "Content-Type": "application/json" },
  });
}

describe("ProfileWorldMapSection", () => {
  it("renders spoiler-safe world map summary with inventory and location detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);

        if (url === "/api/onboarding") {
          return Promise.resolve(
            jsonResponse({ ok: true, onboarding: { householdId: "household-1" } }),
          );
        }

        if (url === "/api/child-profiles/child-1/world?householdId=household-1") {
          return Promise.resolve(
            jsonResponse({
              character: {
                id: "character-1",
                name: "Lumi",
                characterType: "explorer",
                subtype: "fox",
              },
              world: {
                id: "world-1",
                childProfileId: "child-1",
                characterId: "character-1",
                lifecycleStatus: "active",
                homeLocationId: "location-1",
                latestCheckpointId: "checkpoint-1",
                currentLocation: {
                  id: "location-1",
                  regionId: "region-1",
                  displayName: "Yuva",
                  locationType: "den",
                },
                regions: [
                  {
                    id: "region-1",
                    regionKey: "starter",
                    displayName: "Baslangic Vadisi",
                    regionType: "forest",
                    accessibilityStatus: "open",
                    discoveryStatus: "discovered",
                    summary: "Bu bolge artik haritada gorunuyor.",
                    isCurrentRegion: true,
                    locations: [
                      {
                        id: "location-1",
                        locationKey: "home",
                        displayName: "Yuva",
                        locationType: "den",
                        accessibilityStatus: "open",
                        accessibilityHint: "Kesfe acik gorunuyor.",
                        isHome: true,
                        isCurrent: true,
                        safetyLevel: "safe",
                      },
                      {
                        id: "location-2",
                        locationKey: "clearing",
                        displayName: "Acik Alan",
                        locationType: "clearing",
                        accessibilityStatus: "restricted",
                        accessibilityHint: "Biraz daha hazirlik gerekebilir.",
                        isHome: false,
                        isCurrent: false,
                        safetyLevel: "watchful",
                      },
                    ],
                  },
                  {
                    id: "region-2",
                    regionKey: "mystery",
                    displayName: "Kesfedilmemis bolge",
                    regionType: "unknown",
                    accessibilityStatus: "restricted",
                    discoveryStatus: "unknown",
                    summary: "Bu bolgenin ayrintilari henuz acilmadi.",
                    isCurrentRegion: false,
                    locations: [],
                  },
                ],
              },
            }),
          );
        }

        if (
          url ===
          "/api/inventory/list?householdId=household-1&ownerType=character&ownerId=character-1"
        ) {
          return Promise.resolve(
            jsonResponse({
              items: [
                {
                  id: "item-1",
                  displayName: "Parlayan Fener",
                  category: "tool",
                  rarity: "common",
                  quantity: 1,
                  conditionStatus: "pristine",
                },
                {
                  id: "item-2",
                  displayName: "Yildiz Tozu",
                  category: "resource",
                  rarity: "rare",
                  quantity: 2,
                  conditionStatus: "stable",
                },
              ],
            }),
          );
        }

        return Promise.reject(new Error("Beklenmeyen fetch: " + url));
      }),
    );

    render(<ProfileWorldMapSection childProfileId="child-1" />);

    await waitFor(() => {
      expect(screen.getByText("Haritayi Incele")).toBeTruthy();
    });

    expect(screen.getByText("Baslangic Vadisi")).toBeTruthy();
    expect(screen.getByText("Kesfedilmemis bolge")).toBeTruthy();
    expect(screen.getAllByText("Yuva").length).toBeGreaterThan(0);
    expect(screen.getByText("Kesfe acik gorunuyor.")).toBeTruthy();
    expect(screen.getByText("Gorunen bolge")).toBeTruthy();
    expect(screen.getByText("Canta ozeti")).toBeTruthy();
    expect(screen.getByText("Parlayan Fener")).toBeTruthy();
    expect(screen.getByText("3 esya")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("Karakter burada")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Acik Alan/i }));

    await waitFor(() => {
      expect(screen.getAllByText("Biraz daha hazirlik gerekebilir.").length).toBeGreaterThan(1);
    });
    expect(screen.getAllByText("watchful").length).toBeGreaterThan(0);
    expect(screen.getByText("Gorunur nokta")).toBeTruthy();
  });

  it("requests the selected character world when characterId is provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);

        if (url === "/api/onboarding") {
          return Promise.resolve(
            jsonResponse({ ok: true, onboarding: { householdId: "household-1" } }),
          );
        }

        if (
          url ===
          "/api/child-profiles/child-1/world?householdId=household-1&characterId=character-2"
        ) {
          return Promise.resolve(
            jsonResponse({
              character: {
                id: "character-2",
                name: "Mira",
                characterType: "inventor",
                subtype: "owl",
              },
              world: {
                id: "world-2",
                childProfileId: "child-1",
                characterId: "character-2",
                lifecycleStatus: "active",
                homeLocationId: null,
                latestCheckpointId: null,
                currentLocation: null,
                regions: [],
              },
            }),
          );
        }

        if (
          url ===
          "/api/inventory/list?householdId=household-1&ownerType=character&ownerId=character-2"
        ) {
          return Promise.resolve(jsonResponse({ items: [] }));
        }

        return Promise.reject(new Error("Beklenmeyen fetch: " + url));
      }),
    );

    render(
      <ProfileWorldMapSection childProfileId="child-1" characterId="character-2" />,
    );

    await waitFor(() => {
      expect(screen.getByText("Haritayi Incele")).toBeTruthy();
    });

    expect(screen.getByText("Mira")).toBeTruthy();
  });

  it("shows empty state when no world exists yet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);

        if (url === "/api/onboarding") {
          return Promise.resolve(
            jsonResponse({ ok: true, onboarding: { householdId: "household-1" } }),
          );
        }

        if (url === "/api/child-profiles/child-1/world?householdId=household-1") {
          return Promise.resolve(jsonResponse({ character: null, world: null }));
        }

        return Promise.reject(new Error("Beklenmeyen fetch: " + url));
      }),
    );

    render(<ProfileWorldMapSection childProfileId="child-1" />);

    await waitFor(() => {
      expect(screen.getByText("Harita henuz hazir degil")).toBeTruthy();
    });
  });
});
