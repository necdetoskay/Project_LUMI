// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CharacterTypeStepClient from "@/app/app/profiles/[childProfileId]/characters/new/type/character-type-step-client";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  push.mockReset();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ onboarding: { householdId: "household-1" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: { displayName: "Lina" } }),
      }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CharacterTypeStepClient", () => {
  it("renders the four approved character types and keeps Continue disabled initially", async () => {
    render(<CharacterTypeStepClient childProfileId="profile-1" />);

    expect(screen.getByRole("heading", { name: "Nasıl bir karakter olsun?" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /İnsan/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Hayvan/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Fantastik/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Sentetik/ })).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: /Devam et/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    await waitFor(() => {
      expect(screen.getByText("Lina")).toBeTruthy();
    });
  });

  it("allows only one selected type and enables Continue", () => {
    render(<CharacterTypeStepClient childProfileId="profile-1" />);

    const human = screen.getByTestId("character-type-human");
    const fantastic = screen.getByTestId("character-type-fantastic");

    fireEvent.click(human);
    expect(human.getAttribute("aria-pressed")).toBe("true");
    expect(
      (screen.getByRole("button", { name: /Devam et/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);

    fireEvent.click(fantastic);
    expect(human.getAttribute("aria-pressed")).toBe("false");
    expect(fantastic.getAttribute("aria-pressed")).toBe("true");
  });

  it("routes to Step 2 with the selected type without persisting a character", () => {
    render(<CharacterTypeStepClient childProfileId="profile-1" />);

    fireEvent.click(screen.getByTestId("character-type-fantastic"));
    fireEvent.click(screen.getByRole("button", { name: /Devam et/ }));

    expect(push).toHaveBeenCalledWith(
      "/app/profiles/profile-1/characters/new/character?characterType=fantastic",
    );

    const fetchMock = vi.mocked(fetch);
    expect(
      fetchMock.mock.calls.some(([url, init]) => {
        const value = String(url);
        return (
          value.includes("character-bootstrap/consume") ||
          (init as RequestInit | undefined)?.method === "POST"
        );
      }),
    ).toBe(false);
  });

  it("exposes the current step for assistive technology and a dashboard cancel link", () => {
    render(<CharacterTypeStepClient childProfileId="profile-1" />);

    expect(
      screen
        .getByText("Karakter Tipi")
        .closest("li")
        ?.getAttribute("aria-current"),
    ).toBe("step");
    expect(
      screen.getByRole("link", { name: "Vazgeç" }).getAttribute("href"),
    ).toBe("/app/profiles/profile-1");
  });
});
