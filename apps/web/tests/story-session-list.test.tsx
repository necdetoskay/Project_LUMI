import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  StorySessionList,
  type StorySessionSummary,
} from "@/components/story/story-session-list";

describe("StorySessionList", () => {
  it("renders empty state", () => {
    render(<StorySessionList sessions={[]} />);

    expect(screen.getByText("Henuz hikaye yok")).toBeTruthy();
  });

  it("renders resume link for a session", () => {
    const sessions: StorySessionSummary[] = [
      {
        session: {
          id: "session-1",
          sessionStatus: "active",
          playbackMode: "reading",
          updatedAt: "2026-08-04T08:00:00.000Z",
        },
        currentScene: {
          title: "Acilis",
          sceneKey: "intro",
        },
        definition: {
          title: "Deneme Hikayesi",
        },
        version: {
          versionNumber: 1,
          title: "Ilk Surum",
        },
        latestCheckpoint: {
          createdAt: "2026-08-04T08:05:00.000Z",
        },
      },
    ];

    render(<StorySessionList sessions={sessions} />);

    const link = screen.getByRole("link", {
      name: "Devam et",
    }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/app/stories/session-1");
  });
});
