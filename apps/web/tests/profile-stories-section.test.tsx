import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProfileStoriesSection } from "@/components/story/profile-stories-section";

function jsonResponse(body: unknown, ok = true, status?: number): Response {
  return new Response(JSON.stringify(body), {
    status: status ?? (ok ? 200 : 500),
    headers: { "Content-Type": "application/json" },
  });
}

describe("ProfileStoriesSection", () => {
  it("renders source-driven launch cards and recommends fitting stories", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);

        if (url === "/api/onboarding") {
          return Promise.resolve(
            jsonResponse({ onboarding: { householdId: "household-1", hasHousehold: true } }),
          );
        }

        if (url === "/api/child-profiles/child-1/stories?householdId=household-1") {
          return Promise.resolve(
            jsonResponse({
              sessions: [],
              catalog: [
                {
                  definition: {
                    id: "story-1",
                    title: "Orman Macerasi",
                    storyType: "interactive",
                    sourceType: "generated",
                  },
                  version: {
                    id: "version-1",
                    versionNumber: 1,
                    title: "Ilk Surum",
                    storyMode: "interactive",
                    summary: "Parlayan fener ile ilerleyen secimli bir yolculuk.",
                  },
                },
                {
                  definition: {
                    id: "story-2",
                    title: "Gecit Tetikte",
                    storyType: "world_event",
                    sourceType: "authored",
                  },
                  version: {
                    id: "version-2",
                    versionNumber: 3,
                    title: "Dunya Nabzi",
                    storyMode: "static",
                    summary: "Vadide gelisen olaylari takip eder.",
                  },
                },
              ],
              launchOptions: [
                {
                  character: {
                    id: "character-1",
                    childProfileId: "child-1",
                    name: "Lumi",
                    characterType: "explorer",
                    subtype: "fox",
                  },
                  world: {
                    id: "world-1",
                    lifecycleStatus: "active",
                    label: "Ay Isigi Vadisi",
                  },
                  storySources: [
                    {
                      id: "world:world-1",
                      kind: "world_state",
                      title: "Sakin Koy",
                      summary: "Sakin Koy cevresinde yeni bir hikaye baslayabilir.",
                      detail: "Son dunya checkpoint'i hazir: #2",
                    },
                    {
                      id: "origin:character-1",
                      kind: "origin",
                      title: "Yuva Kenari",
                      summary: "Karakterin cikis fikrinden ilerleyen bir baslangic.",
                      detail: "Yuva izi: Agac Evi",
                    },
                    {
                      id: "inventory:item-1",
                      kind: "inventory",
                      title: "Parlayan Fener",
                      summary: "tool esyasi hikaye icin dogrudan bir hareket noktasi sunuyor.",
                      detail: "common | adet 1",
                    },
                  ],
                },
              ],
            }),
          );
        }

        return Promise.reject(new Error("Beklenmeyen fetch: " + url));
      }),
    );

    render(<ProfileStoriesSection childProfileId="child-1" />);

    await waitFor(() => {
      expect(screen.getByText("Hikayeler")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Yeni hikaye baslat/i }));

    await waitFor(() => {
      expect(screen.getByText("Hikaye kaynagi sec")).toBeTruthy();
    });

    expect(screen.getByText("Sakin Koy")).toBeTruthy();
    expect(screen.getByText("Parlayan Fener")).toBeTruthy();
    expect(screen.getByText("Onerilen eslesme")).toBeTruthy();
    expect(screen.getByDisplayValue("Onerilen - Gecit Tetikte - v3")).toBeTruthy();
    expect(screen.getByText("Bu baglamdan hikaye baslat")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Parlayan Fener/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Onerilen - Orman Macerasi - v1")).toBeTruthy();
    });
  });
});
