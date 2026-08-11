import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CanonicalItemImage } from "@/components/assets/canonical-item-image";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CanonicalItemImage", () => {
  it("shows the canonical item icon through the scoped content route", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ canon: { selectedAssetId: "asset-1" } }),
      }),
    );

    render(
      <CanonicalItemImage
        householdId="household-1"
        itemId="item-1"
        itemName="Sihirli pusula"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByAltText("Sihirli pusula eşya görseli").getAttribute("src"),
      ).toContain(
        "/api/assets/subjects/item/item-1/content/asset-1?householdId=household-1",
      );
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/assets/subjects/item/item-1?householdId=household-1&assetKind=item-icon",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("keeps a category fallback when no canonical image exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ canon: null }),
      }),
    );
    const { container } = render(
      <CanonicalItemImage
        householdId="household-1"
        itemId="item-1"
        itemName="Taş"
      />,
    );
    await waitFor(() => {
      expect(
        container.firstElementChild?.getAttribute("data-visual-state"),
      ).toBe("empty");
    });
  });
});
