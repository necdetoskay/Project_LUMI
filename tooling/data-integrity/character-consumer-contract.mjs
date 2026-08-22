import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");
const read = (path) => readFile(resolve(root, path), "utf8");

const [legacyRepository, avatarRepository, npcRepository] = await Promise.all([
  read("packages/profiles/src/db/repositories/drizzle/drizzle-character.repository.ts"),
  read(
    "packages/profiles/src/db/repositories/drizzle/drizzle-child-avatar.repository.ts",
  ),
  read("packages/world/src/db/repositories/drizzle/drizzle-npc.repository.ts"),
]);

assert.match(legacyRepository, /\.from\(childAvatars\)/);
assert.match(legacyRepository, /\.innerJoin\([\s\S]*lumiCharacters/);
assert.doesNotMatch(
  legacyRepository.match(/async findByChildProfile[\s\S]*?async listByHousehold/)?.[0] ?? "",
  /characterSubtype/,
);
assert.match(avatarRepository, /\.from\(childAvatars\)/);
assert.match(npcRepository, /\.from\(worldNpcs\)/);
assert.match(npcRepository, /eq\(worldNpcs\.worldId, worldId\)/);

console.warn("Typed character consumer contract self-test OK");
