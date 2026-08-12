import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const characterHubPath = path.resolve(
  __dirname,
  "../app/app/assets/characters/[characterId]/page.tsx",
);
const storyWorkspacePath = path.resolve(
  __dirname,
  "../app/app/assets/stories/[sessionId]/page.tsx",
);

describe("Visual Library v3 story workspace contract", () => {
  it("binds character story sessions to story-scoped visual workspaces", () => {
    const source = fs.readFileSync(characterHubPath, "utf8");
    expect(source).toContain("listSessionsForChildProfile");
    expect(source).toContain("getSessionPlaybackState");
    expect(source).toContain("/app/assets/stories/");
    expect(source).toContain("Manifest bekliyor");
  });

  it("keeps asset categories inside the story workspace", () => {
    const source = fs.readFileSync(storyWorkspacePath, "utf8");
    expect(source).toContain("Story Visual Workspace");
    expect(source).toContain("Genel Bakış");
    expect(source).toContain("Karakterler");
    expect(source).toContain("Eşyalar");
    expect(source).toContain("Ortamlar");
    expect(source).toContain("Sahneler");
    expect(source).toContain("Eksik görselleri oluştur");
    expect(source).toContain("Görsel stilini değiştir");
  });
});
