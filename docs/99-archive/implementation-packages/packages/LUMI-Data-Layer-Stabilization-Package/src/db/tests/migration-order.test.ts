import { describe, expect, it } from "vitest";
import { readdir } from "node:fs/promises";
import path from "node:path";

describe("migration order", () => {
  it("contains all required migrations in order", async () => {
    const migrationDir = path.resolve(process.cwd(), "migrations");
    const files = (await readdir(migrationDir))
      .filter((name) => name.endsWith(".sql"))
      .sort();

    expect(files).toEqual([
      "0001_foundation.sql",
      "0002_identity_and_profile.sql",
      "0003_world_and_media.sql",
      "0004_character_and_inventory.sql",
      "0005_story_and_education.sql",
      "0006_simulation_and_memory.sql",
      "0007_ai_audit_system.sql",
      "0008_data_layer_stabilization.sql",
    ]);
  });
});
