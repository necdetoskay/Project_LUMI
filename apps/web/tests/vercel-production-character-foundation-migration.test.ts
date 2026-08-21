import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

function readRepoFile(relativeUrl: string): string {
  return readFileSync(fileURLToPath(new URL(relativeUrl, import.meta.url)), "utf8");
}

describe("production Character Foundation migration chain", () => {
  it("promotes the child-avatar uniqueness migration immediately after foundations", () => {
    const script = readRepoFile(
      "../scripts/vercel-production-character-foundation-migrate.mjs",
    );

    const foundationsIndex = script.indexOf("0073_character_foundations.sql");
    const childAvatarScopeIndex = script.indexOf(
      "0074_child_avatar_active_unique_scope.sql",
    );

    expect(foundationsIndex).toBeGreaterThanOrEqual(0);
    expect(childAvatarScopeIndex).toBeGreaterThan(foundationsIndex);
  });

  it("keeps active uniqueness scoped to the child avatar while allowing NPC identities", () => {
    const migration = readRepoFile(
      "../../../packages/profiles/migrations/0074_child_avatar_active_unique_scope.sql",
    );

    expect(migration).toMatch(
      /CREATE UNIQUE INDEX\s+lumi_characters_active_per_profile_unique/i,
    );
    expect(migration).toMatch(/ON\s+profile\.lumi_characters\s*\(child_profile_id\)/i);
    expect(migration).toMatch(/deleted_at\s+IS\s+NULL/i);
    expect(migration).toMatch(/character_subtype\s*=\s*'child_avatar'/i);
  });
});
