// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CanonicalCharacterImage } from "@/components/assets/canonical-character-image";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const imageProps = { ...props };
    delete imageProps.fill;
    delete imageProps.priority;
    delete imageProps.unoptimized;
    return createElement("img", imageProps);
  },
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CanonicalCharacterImage", () => {
  it("renders the selected canonical asset through the protected content route", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ canon: { selectedAssetId: "asset-1" } }),
      }),
    );

    render(
      <CanonicalCharacterImage
        characterId="character-1"
        characterName="Arin"
        householdId="household-1"
      />,
    );

    const image = await screen.findByAltText("Arin karakter görünümü");
    expect(image.getAttribute("src")).toBe(
      "/api/assets/characters/character-1/content/asset-1?householdId=household-1",
    );
  });

  it("keeps a truthful fallback when no canonical asset exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ canon: null }),
      }),
    );

    const { container } = render(
      <CanonicalCharacterImage
        characterId="character-1"
        characterName="Arin"
        householdId="household-1"
      />,
    );

    await waitFor(() => {
      expect(
        container.firstElementChild?.getAttribute("data-visual-state"),
      ).toBe("empty");
    });
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("prefers the requested semantic variant from the canonical set", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          canon: { selectedAssetId: "sheet-1" },
          variants: [
            {
              id: "head-1",
              assetKind: "head-front",
              sourceCompositeAssetId: "sheet-1",
            },
          ],
        }),
      }),
    );

    render(
      <CanonicalCharacterImage
        characterId="character-1"
        characterName="Arin"
        householdId="household-1"
        variant="head-front"
      />,
    );

    const image = await screen.findByAltText("Arin karakter görünümü");
    expect(image.getAttribute("src")).toContain("/content/head-1?");
  });

  it("ignores a late response after unmount", async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
      ),
    );

    const view = render(
      <CanonicalCharacterImage
        characterId="character-1"
        characterName="Arin"
        householdId="household-1"
      />,
    );
    view.unmount();

    await act(async () => {
      resolveRequest?.({
        ok: true,
        json: async () => ({ canon: { selectedAssetId: "asset-1" } }),
      });
    });
  });
});
