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
  it("shows a readable message when the initial API response is HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).startsWith("/api/inventory/list")) {
          return response({ items: [] });
        }
        return new Response("<!DOCTYPE html><title>Server error</title>", {
          status: 500,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }),
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

    expect(
      await screen.findByText(
        "Görsel kütüphanesi okunamadı. Sunucu geçici olarak yanıt veremedi.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/Unexpected token/)).toBeNull();
  });

  it("generates a seven-view reference set with the selected candidate count", async () => {
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

    fireEvent.click(
      screen.getByRole("button", { name: "Aday sayısını artır" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Aday sayısını artır" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "3 görsel üret" }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([, init]) => init?.method === "POST",
      );
      expect(postCall).toBeDefined();
      const payload = JSON.parse(String(postCall?.[1]?.body));
      expect(payload.action).toBe("generate");
      expect(payload.candidateCount).toBe(3);
      expect(payload.aspectRatio).toBe("3:2");
      expect(payload.mode).toBe("reference-sheet");
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
    fireEvent.click(screen.getByText("Ayrıntılar"));
    expect(screen.getByText(/1024×1024/)).toBeTruthy();
    expect(screen.getByText(/krea\/krea-2-medium-turbo/)).toBeTruthy();
  });

  it("previews and visibly selects a derived character view", async () => {
    const bodyThreeQuarterId = "51000000-0000-4000-8000-000000000091";
    const headThreeQuarterId = "51000000-0000-4000-8000-000000000092";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        response({
          canon: null,
          candidates: [
            {
              id: ASSET_ID,
              storageRef: "artifact://lina-sheet.png",
              mimeType: "image/png",
              width: 1536,
              height: 1024,
              lifecycleState: "candidate",
              provider: "openrouter",
              model: "krea/krea-2-medium-turbo",
              candidateIndex: 0,
              createdAt: "2026-08-10T14:06:49.000Z",
            },
          ],
          variants: [
            {
              id: bodyThreeQuarterId,
              storageRef: "artifact://lina-body-three-quarter.png",
              mimeType: "image/png",
              width: 384,
              height: 512,
              lifecycleState: "candidate",
              provider: "derived",
              model: null,
              candidateIndex: 0,
              createdAt: "2026-08-10T14:06:49.000Z",
              assetKind: "body-three-quarter",
              sourceCompositeAssetId: ASSET_ID,
            },
            {
              id: headThreeQuarterId,
              storageRef: "artifact://lina-head-three-quarter.png",
              mimeType: "image/png",
              width: 512,
              height: 512,
              lifecycleState: "candidate",
              provider: "derived",
              model: null,
              candidateIndex: 0,
              createdAt: "2026-08-10T14:06:49.000Z",
              assetKind: "head-three-quarter",
              sourceCompositeAssetId: ASSET_ID,
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

    const bodyButton = await screen.findByRole("button", {
      name: "Tam boy ¾ — Ana canon",
    });
    const avatarButton = screen.getByRole("button", {
      name: "Yarım ¾ — Uygulama görseli",
    });

    expect(bodyButton.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getAllByText("Ana canon").length).toBeGreaterThan(0);

    fireEvent.click(avatarButton);

    expect(avatarButton.getAttribute("aria-pressed")).toBe("true");
    expect(bodyButton.getAttribute("aria-pressed")).toBe("false");
    expect(
      screen.getAllByAltText("Lina Yarım ¾")[0]?.getAttribute("src"),
    ).toContain(headThreeQuarterId);
    expect(screen.getAllByText("Uygulama görseli").length).toBeGreaterThan(0);
  });

  it("shows bag generation results inside the bag workspace", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.startsWith("/api/inventory/list"))
          return response({ items: [] });
        if (url === "/api/assets/bags" && init?.method === "POST") {
          return response({ assets: [{ id: "bag-1" }, { id: "bag-2" }] }, 201);
        }
        if (url.includes("/api/assets/subjects/character/")) {
          return response({
            canon: {
              selectedAssetId: url.includes("bag-open")
                ? "bag-open-1"
                : "bag-closed-1",
            },
          });
        }
        return response({ canon: null, candidates: [], variants: [] });
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
            originConcept: "Kaşif",
          },
        ]}
      />,
    );
    fireEvent.click(await screen.findByRole("tab", { name: /Çanta/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Çanta görselleri üret" }),
    );

    expect(
      await screen.findByText("Açık ve kapalı çanta görselleri hazırlandı."),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Açık" }));
    expect(screen.getByText("Açık çanta")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kapalı" }));
    expect(screen.getByText("Kapalı çanta")).toBeTruthy();
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) =>
          String(input).includes("assetKind=bag-open"),
        ),
      ).toBe(true);
    });
  });

  it("keeps per-item success and failure visible and offers retry", async () => {
    const itemOne = "51000000-0000-4000-8000-000000000071";
    const itemTwo = "51000000-0000-4000-8000-000000000072";
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.startsWith("/api/inventory/list"))
          return response({
            items: [
              {
                id: itemOne,
                displayName: "Pusula",
                category: "tool",
                rarity: "common",
              },
              {
                id: itemTwo,
                displayName: "Fener",
                category: "tool",
                rarity: "rare",
              },
            ],
          });
        if (url === "/api/assets/items/batch" && init?.method === "POST") {
          const body = JSON.parse(String(init.body));
          return body.itemIds[0] === itemOne
            ? response({ assets: [{ id: "asset-1" }] }, 201)
            : response({ error: "ITEM_IMAGE_EMPTY" }, 400);
        }
        if (url.includes("/api/assets/subjects/item/"))
          return response({ canon: null });
        return response({ canon: null, candidates: [], variants: [] });
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
            originConcept: "Kaşif",
          },
        ]}
      />,
    );
    fireEvent.click(await screen.findByRole("tab", { name: /Eşyalar/ }));
    fireEvent.click(
      await screen.findByRole("button", { name: "2 eşyayı üret" }),
    );

    expect(
      await screen.findByText(/1 eşya hazırlandı; 1 eşya üretilemedi/),
    ).toBeTruthy();
    expect(screen.getByText("Hazır")).toBeTruthy();
    expect(screen.getByText("Başarısız")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tekrar dene" })).toBeTruthy();
  });
});
