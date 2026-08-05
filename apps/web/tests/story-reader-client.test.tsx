import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StoryReaderClient } from "@/components/story/story-reader-client";

type MockJsonResponse = {
  ok: boolean;
  status?: number;
  body: unknown;
};

const BASE_READER_PAYLOAD = {
  playback: {
    session: {
      id: "session-1",
      childProfileId: "child-1",
      storyVersionId: "version-1",
      sessionStatus: "active",
      playbackMode: "reading",
      version: 3,
      updatedAt: "2026-08-04T09:00:00.000Z",
    },
    currentScene: {
      id: "scene-1111-1111-1111-111111111111",
      sceneKey: "intro",
      title: "Acilis",
      narrativeText: "Merhaba dunya",
    },
    visits: [{ id: "visit-1" }],
    latestCheckpoint: {
      contentHash: "hash-1",
      createdAt: "2026-08-04T09:01:00.000Z",
    },
  },
  graph: {
    version: {
      id: "version-1",
      versionNumber: 1,
      title: "Ilk Surum",
    },
  },
  choices: [
    {
      point: {
        id: "choice-point-1",
        prompt: "Nereye gidelim?",
      },
      options: [
        {
          option: {
            id: "option-1",
            label: "Ormanci patika",
          },
          available: true,
          reasonCode: null,
          nextSceneId: "44444444-4444-4444-8444-444444444444",
        },
      ],
    },
  ],
};

const BASE_HISTORY = [
  {
    id: "committed-1",
    choicePointId: "choice-point-1",
    optionId: "option-1",
    evidenceSceneId: "scene-1111-1111-1111-111111111111",
    ruleVersion: 1,
    committedAt: "2026-08-04T09:02:00.000Z",
  },
];

const BASE_CHECKPOINT = {
  id: "checkpoint-1",
  sceneId: "scene-1111-1111-1111-111111111111",
  checkpointType: "manual",
  sequenceNumber: 2,
  createdAt: "2026-08-04T09:03:00.000Z",
};

function jsonResponse(input: MockJsonResponse): Response {
  return new Response(JSON.stringify(input.body), {
    status: input.status ?? (input.ok ? 200 : 500),
    headers: { "Content-Type": "application/json" },
  });
}

describe("StoryReaderClient", () => {
  const originalCrypto = globalThis.crypto;

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        randomUUID: () => "uuid-1",
      },
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: originalCrypto,
    });
  });

  it("loads reader state, history and checkpoint summary", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url === "/api/onboarding") {
          return Promise.resolve(
            jsonResponse({ ok: true, body: { onboarding: { householdId: "household-1" } } }),
          );
        }

        if (url === "/api/child-profiles/child-1?householdId=household-1") {
          return Promise.resolve(
            jsonResponse({
              ok: true,
              body: {
                profile: {
                  id: "child-1",
                  displayName: "Lumi",
                  ageBand: "6-8",
                },
              },
            }),
          );
        }

        if (
          url === "/api/stories/sessions/session-1/reader?householdId=household-1" &&
          (!init || init.method === undefined)
        ) {
          return Promise.resolve(jsonResponse({ ok: true, body: BASE_READER_PAYLOAD }));
        }

        if (
          url === "/api/stories/sessions/session-1/choices/history?householdId=household-1" &&
          (!init || init.method === undefined)
        ) {
          return Promise.resolve(jsonResponse({ ok: true, body: { history: BASE_HISTORY } }));
        }

        if (
          url === "/api/stories/sessions/session-1/checkpoints/latest?householdId=household-1" &&
          (!init || init.method === undefined)
        ) {
          return Promise.resolve(jsonResponse({ ok: true, body: { checkpoint: BASE_CHECKPOINT } }));
        }

        return Promise.reject(new Error("Beklenmeyen fetch: " + url));
      }),
    );

    render(<StoryReaderClient sessionId="session-1" />);

    await waitFor(() => {
      expect(screen.getByText("Merhaba dunya")).toBeTruthy();
    });

    expect(screen.getByText("Secim gecmisi")).toBeTruthy();
    expect(screen.getByText("Secim 1")).toBeTruthy();
    expect(screen.getByText("manual")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Checkpoint al" })).toBeTruthy();
    expect(screen.getByText("Dusunme molasi")).toBeTruthy();
    expect(
      screen.getByText("Nazik sorular, sahneyi acele etmeden anlamaya yardim eder."),
    ).toBeTruthy();
  });

  it("renders optional scene image and audio media", async () => {
    const mediaPayload = {
      ...BASE_READER_PAYLOAD,
      playback: {
        ...BASE_READER_PAYLOAD.playback,
        currentScene: {
          ...BASE_READER_PAYLOAD.playback.currentScene,
          media: {
            image: {
              src: "/scene.png",
              alt: "Orman yolu",
              caption: "Yumusak sabah isigi",
            },
            audio: {
              src: "/scene.mp3",
              transcript: "Merhaba dunya sesli anlatim",
            },
          },
        },
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url === "/api/onboarding") {
          return Promise.resolve(
            jsonResponse({ ok: true, body: { onboarding: { householdId: "household-1" } } }),
          );
        }

        if (url === "/api/child-profiles/child-1?householdId=household-1") {
          return Promise.resolve(
            jsonResponse({
              ok: true,
              body: {
                profile: {
                  id: "child-1",
                  displayName: "Lumi",
                  ageBand: "6-8",
                },
              },
            }),
          );
        }

        if (
          url === "/api/stories/sessions/session-1/reader?householdId=household-1" &&
          (!init || init.method === undefined)
        ) {
          return Promise.resolve(jsonResponse({ ok: true, body: mediaPayload }));
        }

        if (
          url === "/api/stories/sessions/session-1/choices/history?householdId=household-1" &&
          (!init || init.method === undefined)
        ) {
          return Promise.resolve(jsonResponse({ ok: true, body: { history: BASE_HISTORY } }));
        }

        if (
          url === "/api/stories/sessions/session-1/checkpoints/latest?householdId=household-1" &&
          (!init || init.method === undefined)
        ) {
          return Promise.resolve(jsonResponse({ ok: true, body: { checkpoint: BASE_CHECKPOINT } }));
        }

        return Promise.reject(new Error("Beklenmeyen fetch: " + url));
      }),
    );

    const { container } = render(<StoryReaderClient sessionId="session-1" />);

    await waitFor(() => {
      expect(screen.getByAltText("Orman yolu")).toBeTruthy();
    });

    expect(screen.getByText("Yumusak sabah isigi")).toBeTruthy();
    expect(screen.getByText("Transcript: Merhaba dunya sesli anlatim")).toBeTruthy();
    expect(container.querySelector("audio")).toBeTruthy();
  });

  it("keeps reading available when scene media fails to load", async () => {
    const mediaPayload = {
      ...BASE_READER_PAYLOAD,
      playback: {
        ...BASE_READER_PAYLOAD.playback,
        currentScene: {
          ...BASE_READER_PAYLOAD.playback.currentScene,
          media: {
            image: {
              src: "/scene.png",
              alt: "Orman yolu",
              caption: "Yumusak sabah isigi",
            },
            audio: {
              src: "/scene.mp3",
            },
          },
        },
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url === "/api/onboarding") {
          return Promise.resolve(
            jsonResponse({ ok: true, body: { onboarding: { householdId: "household-1" } } }),
          );
        }

        if (url === "/api/child-profiles/child-1?householdId=household-1") {
          return Promise.resolve(
            jsonResponse({
              ok: true,
              body: {
                profile: {
                  id: "child-1",
                  displayName: "Lumi",
                  ageBand: "6-8",
                },
              },
            }),
          );
        }

        if (
          url === "/api/stories/sessions/session-1/reader?householdId=household-1" &&
          (!init || init.method === undefined)
        ) {
          return Promise.resolve(jsonResponse({ ok: true, body: mediaPayload }));
        }

        if (
          url === "/api/stories/sessions/session-1/choices/history?householdId=household-1" &&
          (!init || init.method === undefined)
        ) {
          return Promise.resolve(jsonResponse({ ok: true, body: { history: BASE_HISTORY } }));
        }

        if (
          url === "/api/stories/sessions/session-1/checkpoints/latest?householdId=household-1" &&
          (!init || init.method === undefined)
        ) {
          return Promise.resolve(jsonResponse({ ok: true, body: { checkpoint: BASE_CHECKPOINT } }));
        }

        return Promise.reject(new Error("Beklenmeyen fetch: " + url));
      }),
    );

    const { container } = render(<StoryReaderClient sessionId="session-1" />);

    await waitFor(() => {
      expect(screen.getByAltText("Orman yolu")).toBeTruthy();
    });

    fireEvent.error(screen.getByAltText("Orman yolu"));
    const audio = container.querySelector("audio");
    expect(audio).toBeTruthy();
    fireEvent.error(audio as HTMLAudioElement);

    await waitFor(() => {
      expect(
        screen.getByText("Sahne gorseli yuklenemedi. Okumaya metinle devam edebilirsin."),
      ).toBeTruthy();
    });

    expect(
      screen.getByText("Ses oynatma su anda kullanilamiyor. Okumaya metinle devam edebilirsin."),
    ).toBeTruthy();
    expect(screen.getByText("Bu sahnenin gorseli acilamadi.")).toBeTruthy();
    expect(screen.getByText("Bu sahnenin sesi su anda oynatilamiyor.")).toBeTruthy();
    expect(screen.getByText("Merhaba dunya")).toBeTruthy();
  });

  it("keeps the scene readable when history and checkpoint requests fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url === "/api/onboarding") {
          return Promise.resolve(
            jsonResponse({ ok: true, body: { onboarding: { householdId: "household-1" } } }),
          );
        }

        if (url === "/api/child-profiles/child-1?householdId=household-1") {
          return Promise.resolve(
            jsonResponse({
              ok: true,
              body: {
                profile: {
                  id: "child-1",
                  displayName: "Lumi",
                  ageBand: "6-8",
                },
              },
            }),
          );
        }

        if (
          url === "/api/stories/sessions/session-1/reader?householdId=household-1" &&
          (!init || init.method === undefined)
        ) {
          return Promise.resolve(jsonResponse({ ok: true, body: BASE_READER_PAYLOAD }));
        }

        if (url.includes("/choices/history?")) {
          return Promise.resolve(
            jsonResponse({ ok: false, status: 503, body: { message: "history unavailable" } }),
          );
        }

        if (url.includes("/checkpoints/latest?")) {
          return Promise.reject(new Error("checkpoint offline"));
        }

        return Promise.reject(new Error("Beklenmeyen fetch: " + url));
      }),
    );

    render(<StoryReaderClient sessionId="session-1" />);

    await waitFor(() => {
      expect(screen.getByText("Merhaba dunya")).toBeTruthy();
    });

    expect(screen.getByText("Secim gecmisi su anda yuklenemedi.")).toBeTruthy();
    expect(screen.getByText("Checkpoint ozeti su anda yuklenemedi.")).toBeTruthy();
    expect(screen.getByText("Bu oturumda henuz commit edilmis secim yok.")).toBeTruthy();
  });

  it("reveals gentle hints without blocking choice actions", async () => {
    const hintPayload = {
      ...BASE_READER_PAYLOAD,
      choices: [
        {
          point: {
            id: "choice-point-1",
            prompt: "Nereye gidelim?",
          },
          options: [
            {
              option: {
                id: "option-1",
                label: "Ormanci patika",
                consequencePreviews: [
                  {
                    consequenceType: "scene_transition",
                    previewText: "Patika daha sakin ve golgelidir.",
                  },
                ],
              },
              available: true,
              reasonCode: null,
              nextSceneId: "44444444-4444-4444-8444-444444444444",
            },
          ],
        },
      ],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url === "/api/onboarding") {
          return Promise.resolve(
            jsonResponse({ ok: true, body: { onboarding: { householdId: "household-1" } } }),
          );
        }

        if (url === "/api/child-profiles/child-1?householdId=household-1") {
          return Promise.resolve(
            jsonResponse({
              ok: true,
              body: {
                profile: {
                  id: "child-1",
                  displayName: "Lumi",
                  ageBand: "6-8",
                },
              },
            }),
          );
        }

        if (
          url === "/api/stories/sessions/session-1/reader?householdId=household-1" &&
          (!init || init.method === undefined)
        ) {
          return Promise.resolve(jsonResponse({ ok: true, body: hintPayload }));
        }

        if (
          url === "/api/stories/sessions/session-1/choices/history?householdId=household-1" &&
          (!init || init.method === undefined)
        ) {
          return Promise.resolve(jsonResponse({ ok: true, body: { history: BASE_HISTORY } }));
        }

        if (
          url === "/api/stories/sessions/session-1/checkpoints/latest?householdId=household-1" &&
          (!init || init.method === undefined)
        ) {
          return Promise.resolve(jsonResponse({ ok: true, body: { checkpoint: BASE_CHECKPOINT } }));
        }

        return Promise.reject(new Error("Beklenmeyen fetch: " + url));
      }),
    );

    render(<StoryReaderClient sessionId="session-1" />);

    const hintButton = await screen.findByRole("button", { name: "Nazik ipucu" });
    fireEvent.click(hintButton);

    await waitFor(() => {
      expect(screen.getByText("Patika daha sakin ve golgelidir.")).toBeTruthy();
    });

    expect(screen.getByText("Bu ipuclari yon gosterir; kesin sonucu onceden soylemez.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ormanci patika" })).toBeTruthy();
  });

  it("pauses and reloads the reader", async () => {
    const fetchMock = vi.fn();
    let readerLoads = 0;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/onboarding") {
        return Promise.resolve(jsonResponse({ ok: true, body: { onboarding: { householdId: "household-1" } } }));
      }
      if (url === "/api/stories/sessions/session-1/choices/history?householdId=household-1") {
        return Promise.resolve(jsonResponse({ ok: true, body: { history: BASE_HISTORY } }));
      }
      if (url === "/api/stories/sessions/session-1/checkpoints/latest?householdId=household-1") {
        return Promise.resolve(jsonResponse({ ok: true, body: { checkpoint: BASE_CHECKPOINT } }));
      }
      if (
        url === "/api/stories/sessions/session-1/reader?householdId=household-1" &&
        (!init || init.method === undefined)
      ) {
        readerLoads += 1;
        return Promise.resolve(
          jsonResponse({
            ok: true,
            body: {
              ...BASE_READER_PAYLOAD,
              playback: {
                ...BASE_READER_PAYLOAD.playback,
                session: {
                  ...BASE_READER_PAYLOAD.playback.session,
                  sessionStatus: readerLoads > 1 ? "paused" : "active",
                },
              },
            },
          }),
        );
      }
      if (url === "/api/stories/sessions/session-1/pause?householdId=household-1") {
        return Promise.resolve(jsonResponse({ ok: true, body: { ok: true } }));
      }
      return Promise.reject(new Error("Beklenmeyen fetch: " + url));
    });

    vi.stubGlobal("fetch", fetchMock);
    render(<StoryReaderClient sessionId="session-1" />);

    const pauseButton = await screen.findByRole("button", { name: "Duraklat" });
    fireEvent.click(pauseButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Devam ettir" })).toBeTruthy();
    });
  });

  it("commits a choice, advances session and reloads", async () => {
    const fetchMock = vi.fn();
    let readerLoads = 0;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/onboarding") {
        return Promise.resolve(jsonResponse({ ok: true, body: { onboarding: { householdId: "household-1" } } }));
      }
      if (
        url === "/api/stories/sessions/session-1/reader?householdId=household-1" &&
        (!init || init.method === undefined)
      ) {
        readerLoads += 1;
        return Promise.resolve(
          jsonResponse({
            ok: true,
            body: readerLoads > 1
              ? {
                  ...BASE_READER_PAYLOAD,
                  playback: {
                    ...BASE_READER_PAYLOAD.playback,
                    session: {
                      ...BASE_READER_PAYLOAD.playback.session,
                      version: 4,
                    },
                    currentScene: {
                      id: "scene-2",
                      sceneKey: "forest_path",
                      title: "Orman Patikasi",
                      narrativeText: "Patikaya girdin.",
                    },
                    visits: [{ id: "visit-1" }, { id: "visit-2" }],
                  },
                  choices: [],
                }
              : BASE_READER_PAYLOAD,
          }),
        );
      }
      if (url === "/api/stories/sessions/session-1/choices/history?householdId=household-1") {
        return Promise.resolve(jsonResponse({ ok: true, body: { history: BASE_HISTORY } }));
      }
      if (url === "/api/stories/sessions/session-1/checkpoints/latest?householdId=household-1") {
        return Promise.resolve(jsonResponse({ ok: true, body: { checkpoint: BASE_CHECKPOINT } }));
      }
      if (url === "/api/stories/sessions/session-1/choices/choice-point-1/commit?householdId=household-1") {
        return Promise.resolve(jsonResponse({ ok: true, status: 201, body: { committedChoice: { id: "committed-1" } } }));
      }
      if (url === "/api/stories/sessions/session-1/advance?householdId=household-1") {
        return Promise.resolve(jsonResponse({ ok: true, body: { ok: true } }));
      }
      return Promise.reject(new Error("Beklenmeyen fetch: " + url));
    });

    vi.stubGlobal("fetch", fetchMock);
    render(<StoryReaderClient sessionId="session-1" />);

    const optionButtons = await screen.findAllByRole("button", { name: /Ormanci patika/i });
    const firstOptionButton = optionButtons[0];
    expect(firstOptionButton).toBeTruthy();
    fireEvent.click(firstOptionButton as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText("Patikaya girdin.")).toBeTruthy();
    });
  });

  it("creates a manual checkpoint and reloads metadata", async () => {
    const fetchMock = vi.fn();
    let checkpointLoads = 0;

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/onboarding") {
        return Promise.resolve(jsonResponse({ ok: true, body: { onboarding: { householdId: "household-1" } } }));
      }
      if (url === "/api/stories/sessions/session-1/reader?householdId=household-1") {
        return Promise.resolve(jsonResponse({ ok: true, body: BASE_READER_PAYLOAD }));
      }
      if (url === "/api/stories/sessions/session-1/choices/history?householdId=household-1") {
        return Promise.resolve(jsonResponse({ ok: true, body: { history: BASE_HISTORY } }));
      }
      if (url === "/api/stories/sessions/session-1/checkpoints/latest?householdId=household-1") {
        checkpointLoads += 1;
        return Promise.resolve(
          jsonResponse({
            ok: true,
            body: {
              checkpoint:
                checkpointLoads > 1
                  ? { ...BASE_CHECKPOINT, sequenceNumber: 3, createdAt: "2026-08-04T09:05:00.000Z" }
                  : BASE_CHECKPOINT,
            },
          }),
        );
      }
      if (url === "/api/stories/sessions/session-1/checkpoints?householdId=household-1") {
        return Promise.resolve(jsonResponse({ ok: true, status: 201, body: { checkpoint: { ...BASE_CHECKPOINT, sequenceNumber: 3 } } }));
      }
      return Promise.reject(new Error("Beklenmeyen fetch: " + url));
    });

    vi.stubGlobal("fetch", fetchMock);
    render(<StoryReaderClient sessionId="session-1" />);

    const saveButton = await screen.findByRole("button", { name: "Checkpoint al" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Manuel checkpoint kaydedildi.")).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByText("#3")).toBeTruthy();
    });
  });

  it("retries after an initial reader load failure", async () => {
    const fetchMock = vi.fn();
    let readerAttempts = 0;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/onboarding") {
        return Promise.resolve(jsonResponse({ ok: true, body: { onboarding: { householdId: "household-1" } } }));
      }
      if (
        url === "/api/stories/sessions/session-1/reader?householdId=household-1" &&
        (!init || init.method === undefined)
      ) {
        readerAttempts += 1;
        if (readerAttempts === 1) {
          return Promise.resolve(jsonResponse({ ok: false, status: 503, body: { message: "Story Reader gecici olarak kullanilamiyor." } }));
        }
        return Promise.resolve(jsonResponse({ ok: true, body: BASE_READER_PAYLOAD }));
      }
      if (url === "/api/stories/sessions/session-1/choices/history?householdId=household-1") {
        return Promise.resolve(jsonResponse({ ok: true, body: { history: BASE_HISTORY } }));
      }
      if (url === "/api/stories/sessions/session-1/checkpoints/latest?householdId=household-1") {
        return Promise.resolve(jsonResponse({ ok: true, body: { checkpoint: BASE_CHECKPOINT } }));
      }
      return Promise.reject(new Error("Beklenmeyen fetch: " + url));
    });

    vi.stubGlobal("fetch", fetchMock);
    render(<StoryReaderClient sessionId="session-1" />);

    await waitFor(() => {
      expect(screen.getByText("Story Reader gecici olarak kullanilamiyor.")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Tekrar dene" }));

    await waitFor(() => {
      expect(screen.getByText("Merhaba dunya")).toBeTruthy();
    });
  });
});
