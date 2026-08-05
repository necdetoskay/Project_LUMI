import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import SafetySettingsClientPage from "@/app/app/settings/safety/safety-settings-client-page";

function jsonResponse(body: unknown, ok = true, status?: number): Response {
  return new Response(JSON.stringify(body), {
    status: status ?? (ok ? 200 : 500),
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SafetySettingsClientPage", () => {
  it("loads and renders the parent policy with audit history", async () => {
    const fetchMock = vi.fn(
      (input: RequestInfo | URL) =>
        new Promise<Response>((resolve) => {
          const url = String(input);

          if (url === "/api/onboarding") {
            return resolve(
              jsonResponse({
                onboarding: { householdId: "household-1", hasHousehold: true },
              }),
            );
          }
          if (url.startsWith("/api/parent-policy?householdId=household-1")) {
            return resolve(
              jsonResponse({
                policy: {
                  householdId: "household-1",
                  maxDailyStories: 5,
                  contentBoundary: "moderate",
                  timeLimitMinutes: 60,
                  requireParentApprovalForAi: true,
                  allowImageGeneration: true,
                  allowTts: false,
                  blockedTopics: ["fear"],
                  customNotes: ["nazik anlatim"],
                },
              }),
            );
          }
          if (
            url.startsWith("/api/parent-policy/audit?householdId=household-1")
          ) {
            return resolve(
              jsonResponse({
                entries: [
                  {
                    id: "audit-1",
                    actorId: "parent-1",
                    action: "policy.update",
                    beforeState: {},
                    afterState: { contentBoundary: "strict" },
                    createdAt: "2026-08-05T00:00:00.000Z",
                  },
                ],
              }),
            );
          }
          return resolve(jsonResponse({ ok: false }, false, 404));
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<SafetySettingsClientPage />);

    await waitFor(() => {
      expect(screen.getByText("Ebeveyn Güvenlik Ayarları")).toBeTruthy();
    });

    const dailyInput = screen.getByLabelText(
      "Günlük Maksimum Hikaye",
    ) as HTMLInputElement;
    expect(dailyInput.value).toBe("5");

    const topicsInput = screen.getByLabelText(
      "Engellenen Temalar (virgülle ayırın)",
    ) as HTMLInputElement;
    expect(topicsInput.value).toBe("fear");

    expect(await screen.findByText("Politika güncellendi")).toBeTruthy();
    expect(screen.getByText("Sınır: strict")).toBeTruthy();
  });

  it("saves updated policy and refreshes audit", async () => {
    const fetchMock = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((resolve) => {
          const url = String(input);

          if (url === "/api/onboarding") {
            return resolve(
              jsonResponse({
                onboarding: {
                  householdId: "household-1",
                  hasHousehold: true,
                },
              }),
            );
          }
          if (url.startsWith("/api/parent-policy?householdId=household-1")) {
            return resolve(
              jsonResponse({
                policy: {
                  householdId: "household-1",
                  maxDailyStories: 5,
                  contentBoundary: "moderate",
                  timeLimitMinutes: null,
                  requireParentApprovalForAi: true,
                  allowImageGeneration: true,
                  allowTts: true,
                  blockedTopics: [],
                  customNotes: [],
                },
              }),
            );
          }
          if (url === "/api/parent-policy" && init?.method === "PUT") {
            return resolve(
              jsonResponse({
                policy: {
                  householdId: "household-1",
                  maxDailyStories: 8,
                  contentBoundary: "strict",
                  timeLimitMinutes: 30,
                  requireParentApprovalForAi: true,
                  allowImageGeneration: true,
                  allowTts: true,
                  blockedTopics: ["korku"],
                  customNotes: ["nazik anlatim"],
                },
              }),
            );
          }

          const auditMatch = url.startsWith(
            "/api/parent-policy/audit?householdId=household-1",
          );
          if (auditMatch || (init?.method === "PUT" && false)) {
            return resolve(
              jsonResponse({
                entries: [
                  {
                    id: "audit-2",
                    actorId: "parent-1",
                    action: "policy.update",
                    beforeState: {},
                    afterState: { contentBoundary: "strict" },
                    createdAt: "2026-08-05T00:00:00.000Z",
                  },
                ],
              }),
            );
          }
          return resolve(jsonResponse({ ok: false }, false, 404));
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<SafetySettingsClientPage />);

    await waitFor(() => {
      expect(screen.getByText("Ebeveyn Güvenlik Ayarları")).toBeTruthy();
    });

    const dailyInput = screen.getByLabelText(
      "Günlük Maksimum Hikaye",
    ) as HTMLInputElement;
    fireEvent.change(dailyInput, { target: { value: "8" } });

    const topicsInput = screen.getByLabelText(
      "Engellenen Temalar (virgülle ayırın)",
    ) as HTMLInputElement;
    fireEvent.change(topicsInput, { target: { value: "korku" } });

    fireEvent.click(screen.getByRole("button", { name: "Politikayı Kaydet" }));

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url) === "/api/parent-policy" && init?.method === "PUT",
      );
      expect(putCall).toBeDefined();
    });

    const putBody = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url) === "/api/parent-policy" && init?.method === "PUT",
    )![1]?.body as string;
    const payload = JSON.parse(putBody);
    expect(payload.maxDailyStories).toBe(8);
    expect(payload.contentBoundary).toBe("moderate");
    expect(payload.blockedTopics).toEqual(["korku"]);
  });
});
