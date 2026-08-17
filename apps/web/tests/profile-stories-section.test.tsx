import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { ProfileStoriesSection } from "@/components/story/profile-stories-section";
import enStories from "@/messages/stories/en.json";
import trStories from "@/messages/stories/tr.json";

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
        jsonResponse({ onboarding: { householdId: "household-1", hasHousehold: true } }),
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
              playerRecap: "Lina, eski meşe ağacının yanında parlayan izleri buldu.",
              currentSceneTitle: "Eski Meşe Ağacı",
              highlights: [
                { kind: "location", label: "Eski Meşe Ağacı", subjectId: "location-1" },
              ],
              image: null,
            },
            pastAdventures: [],
          },
        }),
      );
    }
    if (url.endsWith("/adventure-candidates?householdId=household-1&page=0")) {
      return Promise.resolve(
        jsonResponse({
          candidates: [
            {
              id: "opportunity:rumor-1",
              sourceFamily: "rumor",
              title: "Ormandaki Mavi Işıklar",
              teaser: "Gece olduğunda ağaçların arasında mavi ışıklar görülüyor.",
              ctaKey: "investigateRumor",
              image: null,
            },
          ],
        }),
      );
    }
    if (url.endsWith("/adventure-candidates?householdId=household-1&page=1")) {
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
    return Promise.reject(new Error(`Beklenmeyen fetch: ${url}`));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderStories(locale: "tr" | "en") {
  const stories = locale === "tr" ? trStories : enStories;
  return render(
    <NextIntlClientProvider locale={locale} messages={{ stories }}>
      <ProfileStoriesSection childProfileId="child-1" />
    </NextIntlClientProvider>,
  );
}

describe("ProfileStoriesSection", () => {
  it("renders Turkish Unicode copy without technical metadata", async () => {
    stubAdventureHubFetch();
    renderStories("tr");

    expect(await screen.findByText("Lina’nın Maceraları")).toBeTruthy();
    expect(screen.getByText("Hikâyeler")).toBeTruthy();
    expect(screen.getByText("En son: Eski Meşe Ağacı")).toBeTruthy();
    expect(screen.queryByText(/Durum:|Mod:|Versiyon|Checkpoint|active|reading/i)).toBeNull();
  });

  it("renders English UI copy through the canonical locale catalog", async () => {
    stubAdventureHubFetch();
    renderStories("en");

    expect(await screen.findByText("Lina's Adventures")).toBeTruthy();
    expect(screen.getByText("Stories")).toBeTruthy();
    expect(screen.getByRole("button", { name: "New Adventure" })).toBeTruthy();
    expect(screen.queryByText("Yeni Macera")).toBeNull();
  });

  it("opens the localized dialog, refreshes candidates, traps focus and restores trigger focus", async () => {
    const fetchMock = stubAdventureHubFetch();
    renderStories("tr");

    const trigger = await screen.findByRole("button", { name: "Yeni Macera" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog", {
      name: "Bugün maceran nereden başlasın?",
    });
    expect(dialog).toBeTruthy();
    const close = screen.getByRole("button", { name: "Kapat" });
    await waitFor(() => expect(document.activeElement).toBe(close));
    expect(await screen.findByText("Bir Söylenti Duydun")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Başka maceralar göster" }));
    expect(await screen.findByText("Dünyada Bir Şey Oldu")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/child-profiles/child-1/stories/adventure-candidates?householdId=household-1&page=1",
    );

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });
});
