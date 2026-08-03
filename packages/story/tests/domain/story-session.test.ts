import { describe, expect, it } from "vitest";
import { StorySession } from "../../src/domain";
import { ValidationError } from "../../src/domain/errors";

describe("StorySession", () => {
  function makeSession() {
    return StorySession.create({
      householdId: crypto.randomUUID(),
      childProfileId: crypto.randomUUID(),
      worldId: crypto.randomUUID(),
      storyDefinitionId: crypto.randomUUID(),
      storyVersionId: crypto.randomUUID(),
    });
  }

  it("starts, pauses, resumes, advances, completes", () => {
    const session = makeSession();
    const sceneId = crypto.randomUUID();
    session.start(sceneId);
    expect(session.status).toBe("active");
    expect(session.currentSceneId).toBe(sceneId);
    expect(session.version).toBe(2);

    session.pause();
    expect(session.status).toBe("paused");

    session.resume();
    expect(session.status).toBe("active");

    const nextSceneId = crypto.randomUUID();
    session.advance(nextSceneId);
    expect(session.currentSceneId).toBe(nextSceneId);

    session.complete();
    expect(session.status).toBe("completed");
  });

  it("rejects invalid transitions", () => {
    const session = makeSession();
    expect(() => session.pause()).toThrow(ValidationError);
    expect(() => session.resume()).toThrow(ValidationError);
    expect(() => session.complete()).toThrow(ValidationError);
  });

  it("rejects advancing a completed session", () => {
    const session = makeSession();
    session.start(crypto.randomUUID());
    session.complete();
    expect(() => session.advance(crypto.randomUUID())).toThrow(ValidationError);
    expect(() => session.pause()).toThrow(ValidationError);
  });

  it("abandons an active session and keeps history", () => {
    const session = makeSession();
    session.start(crypto.randomUUID());
    session.abandon("user_exit");
    expect(session.status).toBe("abandoned");
    expect(session.version).toBe(3);
  });

  it("rejects abandoning a completed session", () => {
    const session = makeSession();
    session.start(crypto.randomUUID());
    session.complete();
    expect(() => session.abandon()).toThrow(ValidationError);
  });
});
