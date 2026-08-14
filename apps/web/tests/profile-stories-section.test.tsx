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
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);

    if (url === "/api/onboarding") {
      return Promise.resolve(
        jsonResponse({
          onboarding: { householdId: "household-1", hasHousehold: true },
        }),
      );
    }

    if (url === "/api/child-profiles/child-1/stories?householdId=household-1") {
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

    if (
      url ===
      "/api/child-profiles/child-1/stories/adventure-candidates?householdId=household-1&page=0"
    ) {
      return Promise.resolve(
        jsonResponse({
          candidates: [
            {
              id: "opportunity:rumor-1",
              sourceFamily: "rumor",
              title: "Ormandaki Mavi Işıklar",
              teaser:
                "Gece olduğunda ağaçların arasında mavi ışıklar görülüyor.",
              ctaKey: "investigateRumor",
              image: null,
            },
            {
              id: "inventory:item-1",
              sourceFamily: "inventory_item",
              title: "Parlayan Pusula",
              teaser: "Pusula, daha önce göstermediği bir yönü işaret ediyor.",
              ctaKey: "followItem",
              image: { kind: "item", subjectId: "item-1" },
            },
          ],
        }),
      );
    }

    if (
      url ===
      "/api/child-profiles/child-1/stories/adventure-candidates?householdId=household-1&page=1"
    ) {
      return Promise.resolve(
        jsonResponse({
          candidates: [
            {
              id: "world:world-1",
              sourceFamily: "world_event",
              title: "Eski Meşe Ağacı",
              teaser: "Ormanda yeni ve merak uyandıran bir şey oluyor.",
              ctaKey: "chooseWorldEvent",
              image: null,
            },
          ],
        }),
      );
    }

    return Promise.reject(new Error("Beklenmeyen fetch: " + url));
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("ProfileStoriesSection", () => {
  it("renders the child-facing Adventure Hub without technical session metadata", async () => {
    stubAdventureHubFetch();

    render(<ProfileStoriesSection childProfileId="child-1" />);

    await waitFor(() => {
      expect(screen.getByText("Lina’nın Maceraları")).toBeTruthy();
    });

    expect(screen.getByText("Fısıldayan Ormandaki İlk Işık")).toBeTruthy();
    expect(
      screen.getByText(
        "Lina, eski meşe ağacının yanında parlayan izleri buldu. Işığın sırrı hâlâ çözülmedi.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("En son: Eski Meşe Ağacı")).toBeTruthy();
    expect(screen.getByText("Ay Işığı Gölünün Sırrı")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Maceraya Devam Et/i }),
    ).toBeTruthy();

    expect(screen.queryByText(/Durum:/i)).toBeNull();
    expect(screen.queryByText(/Mod:/i)).toBeNull();
    expect(screen.queryByText(/Versiyon/i)).toBeNull();
    expect(screen.queryByText(/Checkpoint/i)).toBeNull();
    expect(screen.queryByText(/active/i)).toBeNull();
    expect(screen.queryByText(/reading/i)).toBeNull();
  });

  it("opens the real New Adventure sheet, renders story-safe candidates and refreshes", async () => {
    const fetchMock = stubAdventureHubFetch();

    render(<ProfileStoriesSection childProfileId="child-1" />);

    const button = await screen.findByRole("button", { name: "Yeni Macera" });
    fireEvent.click(button);

    expect(
      await screen.findByRole("dialog", {
        name: "Bugün maceran nereden başlasın?",
      }),
    ).toBeTruthy();
    expect(await screen.findByText("Ormandaki Mavi Işıklar")).toBeTruthy();
    expect(screen.getByText("Bir Söylenti Duydun")).toBeTruthy();
    expect(screen.getByText("Parlayan Pusula")).toBeTruthy();
    expect(screen.getByText("Çantandaki Bir Eşya")).toBeTruthy();
    expect(screen.queryByText(/common \| adet/i)).toBeNull();
    expect(screen.queryByText(/rarity/i)).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Başka maceralar göster" }),
    );

    expect(await screen.findByText("Eski Meşe Ağacı")).toBeTruthy();
    expect(screen.getByText("Dünyada Bir Şey Oldu")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/child-profiles/child-1/stories/adventure-candidates?householdId=household-1&page=1",
    );

    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
