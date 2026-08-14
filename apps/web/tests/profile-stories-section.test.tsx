import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProfileStoriesSection } from "@/components/story/profile-stories-section";

vi.mock("@/components/assets/canonical-character-image", () => ({
  CanonicalCharacterImage: ({ characterName }: { characterName: string }) => (
    <div data-testid="character-image">{characterName}</div>
  ),
}));

function jsonResponse(body: unknown, ok = true, status?: number): Response {
  return new Response(JSON.stringify(body), {
    status: status ?? (ok ? 200 : 500),
    headers: { "Content-Type": "application/json" },
  });
}

function stubAdventureHubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/onboarding") {
        return Promise.resolve(
          jsonResponse({
            onboarding: { householdId: "household-1", hasHousehold: true },
          }),
        );
      }

      if (
        url === "/api/child-profiles/child-1/stories?householdId=household-1"
      ) {
        return Promise.resolve(
          jsonResponse({
            adventureHub: {
              character: { id: "character-1", name: "Lina" },
              ongoingAdventure: {
                sessionId: "session-1",
                title: "Fısıldayan Ormandaki İlk Işık",
                semanticState: "ongoing",
                playerRecap:
                  "Lina, eski meşe ağacının yanında parlayan izleri buldu. Işığın sırrı hâlâ çözülmedi.",
                currentSceneTitle: "Eski Meşe Ağacı",
                highlights: [
                  {
                    kind: "location",
                    label: "Eski Meşe Ağacı",
                    subjectId: "location-1",
                  },
                ],
                image: { kind: "story_scene", subjectId: "scene-1" },
              },
              pastAdventures: [
                {
                  sessionId: "session-old",
                  title: "Ay Işığı Gölünün Sırrı",
                  semanticState: "completed",
                  playerRecap:
                    "Lina, gölün altındaki parlayan geçidin sırrını keşfetti.",
                  currentSceneTitle: "Ay Işığı Gölü",
                  highlights: [],
                  image: null,
                },
              ],
            },
          }),
        );
      }

      return Promise.reject(new Error("Beklenmeyen fetch: " + url));
    }),
  );
}

describe("ProfileStoriesSection", () => {
  it("renders the child-facing Adventure Hub without technical session metadata", async () => {
    stubAdventureHubFetch();

    render(<ProfileStoriesSection childProfileId="child-1" />);

    await waitFor(() => {
      expect(screen.getByText("Lina’ın Maceraları")).toBeTruthy();
    });

    expect(screen.getByText("Fısıldayan Ormandaki İlk Işık")).toBeTruthy();
    expect(
      screen.getByText(
        "Lina, eski meşe ağacının yanında parlayan izleri buldu. Işığın sırrı hâlâ çözülmedi.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("En son: Eski Meşe Ağacı")).toBeTruthy();
    expect(screen.getByText("Ay Işığı Gölünün Sırrı")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Maceraya Devam Et/i })).toBeTruthy();

    expect(screen.queryByText(/Durum:/i)).toBeNull();
    expect(screen.queryByText(/Mod:/i)).toBeNull();
    expect(screen.queryByText(/Versiyon/i)).toBeNull();
    expect(screen.queryByText(/Checkpoint/i)).toBeNull();
    expect(screen.queryByText(/active/i)).toBeNull();
    expect(screen.queryByText(/reading/i)).toBeNull();
  });

  it("keeps the New Adventure entry child-friendly before Phase 3 wiring", async () => {
    stubAdventureHubFetch();

    render(<ProfileStoriesSection childProfileId="child-1" />);

    const button = await screen.findByRole("button", { name: "Yeni Macera" });
    fireEvent.click(button);

    expect(screen.getByText("Yeni macera kapısı açılıyor")).toBeTruthy();
    expect(
      screen.getByText(/Dünya olayları, söylentiler, çantandaki eşyalar/i),
    ).toBeTruthy();
    expect(screen.queryByText(/Hikaye kaynagi sec/i)).toBeNull();
    expect(screen.queryByText(/common \| adet/i)).toBeNull();
  });
});
