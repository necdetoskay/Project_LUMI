import { expect, test, type Page } from "@playwright/test";

const password = "e2e-story-reader-password-456";

async function registerAndLogin(page: Page) {
  const email = `e2e-story-reader-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

  const registerRes = await page.request.post("/api/auth/register", {
    data: {
      displayName: "Story Reader Parent",
      email,
      password,
      confirmPassword: password,
    },
  });
  expect(registerRes.status()).toBe(201);

  const loginRes = await page.request.post("/api/auth/login", {
    data: {
      email,
      password,
      rememberMe: true,
    },
  });
  expect(loginRes.status()).toBe(200);
}

test.describe("Story reader E2E", () => {
  test("supports pause, manual checkpoint and choice advance with mocked session APIs", async ({
    page,
  }) => {
    await registerAndLogin(page);

    await page.route(
      "**/api/child-profiles/child-1?householdId=household-1",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            profile: {
              id: "child-1",
              displayName: "Lumi",
              ageBand: "6-8",
            },
          }),
        });
      },
    );

    let readerLoads = 0;
    let paused = false;
    let checkpointSequence = 2;
    let latestCheckpointTime = "2026-08-04T09:03:00.000Z";
    let sceneTitle = "Acilis";
    let sceneText = "Merhaba dunya";
    let visits = 1;
    let choices = [
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
    ];

    const history = [
      {
        id: "committed-1",
        choicePointId: "choice-point-1",
        optionId: "option-1",
        evidenceSceneId: "scene-1111-1111-1111-111111111111",
        ruleVersion: 1,
        committedAt: "2026-08-04T09:02:00.000Z",
      },
    ];

    await page.route("**/api/onboarding", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          onboarding: { householdId: "household-1", hasHousehold: true },
        }),
      });
    });

    await page.route(
      "**/api/stories/sessions/session-1/choices/history?householdId=household-1",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ history }),
        });
      },
    );

    await page.route(
      "**/api/stories/sessions/session-1/checkpoints/latest?householdId=household-1",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            checkpoint: {
              id: "checkpoint-1",
              sceneId: "scene-1111-1111-1111-111111111111",
              checkpointType: "manual",
              sequenceNumber: checkpointSequence,
              createdAt: latestCheckpointTime,
            },
          }),
        });
      },
    );

    await page.route(
      "**/api/stories/sessions/session-1/reader?householdId=household-1",
      async (route) => {
        readerLoads += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            playback: {
              session: {
                id: "session-1",
                childProfileId: "child-1",
                storyVersionId: "version-1",
                sessionStatus: paused ? "paused" : "active",
                playbackMode: "reading",
                version: readerLoads > 2 ? 4 : 3,
                updatedAt: "2026-08-04T09:00:00.000Z",
              },
              currentScene: {
                id: "scene-1111-1111-1111-111111111111",
                sceneKey: readerLoads > 2 ? "forest_path" : "intro",
                title: sceneTitle,
                narrativeText: sceneText,
              },
              visits: Array.from({ length: visits }, (_, index) => ({
                id: `visit-${index + 1}`,
              })),
              latestCheckpoint: {
                contentHash: "hash-1",
                createdAt: latestCheckpointTime,
              },
            },
            graph: {
              version: {
                id: "version-1",
                versionNumber: 1,
                title: "Ilk Surum",
              },
            },
            choices,
          }),
        });
      },
    );

    await page.route(
      "**/api/stories/sessions/session-1/pause?householdId=household-1",
      async (route) => {
        paused = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      },
    );

    await page.route(
      "**/api/stories/sessions/session-1/checkpoints?householdId=household-1",
      async (route) => {
        checkpointSequence = 3;
        latestCheckpointTime = "2026-08-04T09:05:00.000Z";
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      },
    );

    await page.route(
      "**/api/stories/sessions/session-1/choices/choice-point-1/commit?householdId=household-1",
      async (route) => {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ committedChoice: { id: "committed-1" } }),
        });
      },
    );

    await page.route(
      "**/api/stories/sessions/session-1/advance?householdId=household-1",
      async (route) => {
        sceneTitle = "Orman Patikasi";
        sceneText = "Patikaya girdin.";
        visits = 2;
        choices = [];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      },
    );

    await page.goto("/app/stories/session-1");

    await expect(
      page.getByRole("heading", { name: "Acilis" }).first(),
    ).toBeVisible();
    await expect(page.getByText("Secim gecmisi")).toBeVisible();
    await expect(page.getByText("Secim 1")).toBeVisible();
    await expect(page.getByText("#2")).toBeVisible();

    await page.getByRole("button", { name: "Duraklat" }).click();
    await expect(
      page.getByRole("button", { name: "Devam ettir" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Checkpoint al" }).click();
    await expect(page.getByText("Manuel checkpoint kaydedildi.")).toBeVisible();
    await expect(page.getByText("#3")).toBeVisible();

    await page.getByRole("button", { name: /Ormanci patika/i }).click();
    await expect(page.getByText("Patikaya girdin.")).toBeVisible();
    await expect(
      page.getByText("Bu sahne icin kullanilabilir secim bulunmuyor."),
    ).toBeVisible();
  });

  test("recovers from an initial reader load failure after retry", async ({
    page,
  }) => {
    await registerAndLogin(page);

    await page.route(
      "**/api/child-profiles/child-1?householdId=household-1",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            profile: {
              id: "child-1",
              displayName: "Lumi",
              ageBand: "6-8",
            },
          }),
        });
      },
    );

    let readerAttempts = 0;

    await page.route("**/api/onboarding", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          onboarding: { householdId: "household-1", hasHousehold: true },
        }),
      });
    });

    await page.route(
      "**/api/stories/sessions/session-1/choices/history?householdId=household-1",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ history: [] }),
        });
      },
    );

    await page.route(
      "**/api/stories/sessions/session-1/checkpoints/latest?householdId=household-1",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ checkpoint: null }),
        });
      },
    );

    await page.route(
      "**/api/stories/sessions/session-1/reader?householdId=household-1",
      async (route) => {
        readerAttempts += 1;
        if (readerAttempts === 1) {
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({
              message: "Story Reader gecici olarak kullanilamiyor.",
            }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
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
              latestCheckpoint: null,
            },
            graph: {
              version: {
                id: "version-1",
                versionNumber: 1,
                title: "Ilk Surum",
              },
            },
            choices: [],
          }),
        });
      },
    );

    await page.goto("/app/stories/session-1");

    await expect(
      page.getByText("Story Reader gecici olarak kullanilamiyor."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Tekrar dene" }).click();
    await expect(page.getByText("Merhaba dunya")).toBeVisible();
  });

  test("keeps story text available when scene media assets fail", async ({
    page,
  }) => {
    await registerAndLogin(page);

    await page.route(
      "**/api/child-profiles/child-1?householdId=household-1",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            profile: {
              id: "child-1",
              displayName: "Lumi",
              ageBand: "6-8",
            },
          }),
        });
      },
    );

    await page.route("**/api/onboarding", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          onboarding: { householdId: "household-1", hasHousehold: true },
        }),
      });
    });

    await page.route(
      "**/api/stories/sessions/session-1/reader?householdId=household-1",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
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
                media: {
                  image: {
                    src: "/mock-media/scene.png",
                    alt: "Orman yolu",
                    caption: "Yumusak sabah isigi",
                  },
                  audio: {
                    src: "/mock-media/scene.mp3",
                    transcript: "Merhaba dunya sesli anlatim",
                  },
                },
              },
              visits: [{ id: "visit-1" }],
              latestCheckpoint: null,
            },
            graph: {
              version: {
                id: "version-1",
                versionNumber: 1,
                title: "Ilk Surum",
              },
            },
            choices: [],
          }),
        });
      },
    );

    await page.route(
      "**/api/stories/sessions/session-1/choices/history?householdId=household-1",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ history: [] }),
        });
      },
    );

    await page.route(
      "**/api/stories/sessions/session-1/checkpoints/latest?householdId=household-1",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ checkpoint: null }),
        });
      },
    );

    await page.route("**/mock-media/scene.png", async (route) => {
      await route.abort();
    });

    await page.route("**/mock-media/scene.mp3", async (route) => {
      await route.abort();
    });

    await page.goto("/app/stories/session-1");

    await expect(page.getByText("Merhaba dunya")).toBeVisible();
    await expect(
      page.getByText(
        "Sahne gorseli yuklenemedi. Okumaya metinle devam edebilirsin.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Ses oynatma su anda kullanilamiyor. Okumaya metinle devam edebilirsin.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText("Bu sahnenin gorseli acilamadi."),
    ).toBeVisible();
    await expect(
      page.getByText("Bu sahnenin sesi su anda oynatilamiyor."),
    ).toBeVisible();
  });

  test("keeps reading experience alive when history and checkpoint endpoints fail", async ({
    page,
  }) => {
    await registerAndLogin(page);

    await page.route(
      "**/api/child-profiles/child-1?householdId=household-1",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            profile: {
              id: "child-1",
              displayName: "Lumi",
              ageBand: "6-8",
            },
          }),
        });
      },
    );

    await page.route("**/api/onboarding", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          onboarding: { householdId: "household-1", hasHousehold: true },
        }),
      });
    });

    await page.route(
      "**/api/stories/sessions/session-1/reader?householdId=household-1",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
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
              latestCheckpoint: null,
            },
            graph: {
              version: {
                id: "version-1",
                versionNumber: 1,
                title: "Ilk Surum",
              },
            },
            choices: [],
          }),
        });
      },
    );

    await page.route(
      "**/api/stories/sessions/session-1/choices/history?householdId=household-1",
      async (route) => {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "history unavailable" }),
        });
      },
    );

    await page.route(
      "**/api/stories/sessions/session-1/checkpoints/latest?householdId=household-1",
      async (route) => {
        await route.abort();
      },
    );

    await page.goto("/app/stories/session-1");

    await expect(page.getByText("Merhaba dunya")).toBeVisible();
    await expect(
      page.getByText("Secim gecmisi su anda yuklenemedi."),
    ).toBeVisible();
    await expect(
      page.getByText("Checkpoint ozeti su anda yuklenemedi."),
    ).toBeVisible();
  });
});
