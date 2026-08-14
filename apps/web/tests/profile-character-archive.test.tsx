import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProfileDetailClientPage from "@/app/app/profiles/[childProfileId]/profile-detail-client-page";
vi.mock("@/components/assets/canonical-character-image", () => ({
  CanonicalCharacterImage: ({ characterName }: { characterName: string }) => (
    <div>{characterName}</div>
  ),
}));
vi.mock("@/components/story/profile-stories-section", () => ({
  ProfileStoriesSection: () => <div>stories</div>,
}));
const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
describe("character archive UI", () => {
  it("uses modal confirmation and removes archived character from active list", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/onboarding")
          return Promise.resolve(
            json({ onboarding: { hasHousehold: true, householdId: "h1" } }),
          );
        if (url === "/api/child-profiles/cp1?householdId=h1")
          return Promise.resolve(
            json({
              profile: {
                id: "cp1",
                householdId: "h1",
                displayName: "Ada",
                ageBand: "6-8",
                locale: "tr",
                createdAt: "2026-08-14T00:00:00.000Z",
              },
            }),
          );
        if (url === "/api/characters?householdId=h1&childProfileId=cp1")
          return Promise.resolve(
            json({
              characters: [
                {
                  id: "char1",
                  name: "Lina",
                  broadKind: "human",
                  characterType: "explorer",
                  subtype: "Gezgin",
                  createdAt: "2026-08-14T00:00:00.000Z",
                },
              ],
            }),
          );
        if (
          url === "/api/characters/char1?householdId=h1" &&
          init?.method === "DELETE"
        )
          return Promise.resolve(new Response(null, { status: 204 }));
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<ProfileDetailClientPage childProfileId="cp1" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Karakterler (1)" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Karakteri sil" }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Karakteri sil" }),
    );
    await waitFor(() =>
      expect(screen.getByText("Henuz karakter yok")).toBeTruthy(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/characters/char1?householdId=h1",
      { method: "DELETE" },
    );
  });
});
