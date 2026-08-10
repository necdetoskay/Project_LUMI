import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AssetsClientPage } from "@/app/app/assets/assets-client-page";

const HOUSEHOLD_ID = "51000000-0000-4000-8000-000000000001";
const CHARACTER_ID = "51000000-0000-4000-8000-000000000003";
const ASSET_ID = "51000000-0000-4000-8000-000000000090";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AssetsClientPage", () => {
  it("generates the selected candidate count and aspect ratio", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          return response(
            { job: { status: "succeeded" }, candidates: [] },
            201,
          );
        }
        return response({ canon: null, candidates: [] });
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AssetsClientPage
        householdId={HOUSEHOLD_ID}
        characters={[
          {
            id: CHARACTER_ID,
            name: "Lina",
            subtype: "player",
            originConcept: "Meraklı bir ışık gezgini",
          },
        ]}
      />,
    );

    await screen.findByText("Lina kütüphanesi");

    fireEvent.click(screen.getByRole("button", { name: "3 aday" }));
    fireEvent.change(screen.getByLabelText("Görsel oranı"), {
      target: { value: "4:5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "3 görsel üret" }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([, init]) => init?.method === "POST",
      );
      expect(postCall).toBeDefined();
      const payload = JSON.parse(String(postCall?.[1]?.body));
      expect(payload.action).toBe("generate");
      expect(payload.candidateCount).toBe(3);
      expect(payload.aspectRatio).toBe("4:5");
    });

    expect(
      await screen.findByText("3 yeni görsel adayı oluşturuldu."),
    ).toBeTruthy();
  });

  it("renders the selected canon separately from the candidate library", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        response({
          canon: {
            selectedAssetId: ASSET_ID,
            version: 2,
            selectedAt: "2026-08-10T14:06:49.000Z",
          },
          candidates: [
            {
              id: ASSET_ID,
              storageRef: "artifact://lina.png",
              mimeType: "image/png",
              width: 1024,
              height: 1024,
              lifecycleState: "canonical",
              provider: "openrouter",
              model: "krea/krea-2-medium-turbo",
              candidateIndex: 0,
              createdAt: "2026-08-10T14:06:49.000Z",
            },
          ],
        }),
      ),
    );

    render(
      <AssetsClientPage
        householdId={HOUSEHOLD_ID}
        characters={[
          {
            id: CHARACTER_ID,
            name: "Lina",
            subtype: "player",
            originConcept: "Meraklı bir ışık gezgini",
          },
        ]}
      />,
    );

    const canonLabel = await screen.findByText("Aktif canon");
    const canonPanel = canonLabel.closest("aside");
    expect(canonPanel).not.toBeNull();
    expect(canonPanel?.textContent).toContain("Canon v2");
    expect(screen.getByText("Aktif görünüm")).toBeTruthy();
    expect(
      screen.getByText("1024×1024 · krea/krea-2-medium-turbo"),
    ).toBeTruthy();
  });
});
