import { describe, expect, it } from "vitest";
import { StoryDefinition } from "../../src/domain/story-definition";
import { ValidationError } from "../../src/domain/errors";

describe("StoryDefinition", () => {
  it("creates a draft definition", () => {
    const definition = StoryDefinition.create({
      householdId: crypto.randomUUID(),
      title: "The First Journey",
      slug: "the-first-journey",
      storyType: "interactive",
      sourceType: "authored",
      ageGroup: "6-8",
      defaultLanguage: "tr",
    });

    expect(definition.lifecycle).toBe("draft");
    expect(definition.version).toBe(1);
    expect(definition.currentPublishedVersionId).toBeNull();
  });

  it("sets current published version and lifecycle", () => {
    const definition = StoryDefinition.create({
      householdId: crypto.randomUUID(),
      title: "The First Journey",
      slug: "the-first-journey",
      storyType: "interactive",
      sourceType: "authored",
      ageGroup: "6-8",
      defaultLanguage: "tr",
    });

    const versionId = crypto.randomUUID();
    definition.setCurrentPublishedVersion(versionId);
    expect(definition.lifecycle).toBe("published");
    expect(definition.currentPublishedVersionId).toBe(versionId);
    expect(definition.version).toBe(2);
  });

  it("rejects mutation after archive", () => {
    const definition = StoryDefinition.create({
      householdId: crypto.randomUUID(),
      title: "The First Journey",
      slug: "the-first-journey",
      storyType: "interactive",
      sourceType: "authored",
      ageGroup: "6-8",
      defaultLanguage: "tr",
    });
    definition.archive();
    expect(definition.lifecycle).toBe("archived");
    expect(() =>
      definition.setCurrentPublishedVersion(crypto.randomUUID()),
    ).toThrow(ValidationError);
  });

  it("rejects invalid slug", () => {
    expect(() =>
      StoryDefinition.create({
        householdId: crypto.randomUUID(),
        title: "Bad Slug",
        slug: "Bad Slug",
        storyType: "static",
        sourceType: "authored",
        ageGroup: "6-8",
        defaultLanguage: "tr",
      }),
    ).toThrow(ValidationError);
  });
});
