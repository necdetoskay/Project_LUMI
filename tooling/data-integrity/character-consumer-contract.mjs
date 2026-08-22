import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");
const read = (path) => readFile(resolve(root, path), "utf8");

const [legacyRepository, avatarRepository, npcRepository, bootstrapService] =
  await Promise.all([
    read(
      "packages/profiles/src/db/repositories/drizzle/drizzle-character.repository.ts",
    ),
    read(
      "packages/profiles/src/db/repositories/drizzle/drizzle-child-avatar.repository.ts",
    ),
    read(
      "packages/world/src/db/repositories/drizzle/drizzle-npc.repository.ts",
    ),
    read("packages/profiles/src/application/character-bootstrap.service.ts"),
  ]);

const childProfileRead =
  legacyRepository.match(
    /async findByChildProfile[\s\S]*?async listByHousehold/,
  )?.[0] ?? "";

assert.match(childProfileRead, /\.from\(childAvatars\)/);
assert.match(childProfileRead, /\.innerJoin\([\s\S]*lumiCharacters/);
assert.doesNotMatch(childProfileRead, /\.from\(lumiCharacters\)/);

assert.match(avatarRepository, /\.from\(childAvatars\)/);
assert.match(avatarRepository, /eq\(childAvatars\.householdId, householdId\)/);

assert.match(npcRepository, /\.from\(worldNpcs\)/);
assert.match(npcRepository, /eq\(worldNpcs\.worldId, worldId\)/);
assert.match(npcRepository, /eq\(worldNpcs\.householdId, householdId\)/);

assert.match(bootstrapService, /characterSubtype:\s*"child_avatar"/);
assert.match(
  bootstrapService,
  /characterRepo\.findByChildProfile\([\s\S]*childProfileId[\s\S]*householdId/,
);

console.warn("Typed character consumer contract self-test OK");
