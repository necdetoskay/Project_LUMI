import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LANDING_ASSETS = [
  "hero-world.webp",
  "card-story.webp",
  "card-explore.webp",
  "card-grow.webp",
  "corner-mechanical-fantasy.webp",
  "corner-ocean-map.webp",
  "corner-animals.webp",
];

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const landingDirectory = path.resolve(scriptDirectory, "../public/landing");

function isWebP(buffer) {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function decodePackagedWebP(buffer, filename) {
  if (isWebP(buffer)) {
    return { buffer, converted: false };
  }

  const encoded = buffer.toString("utf8").replace(/\s+/g, "");
  const decoded = Buffer.from(encoded, "base64");

  if (!isWebP(decoded)) {
    throw new Error(
      `[landing-assets] ${filename} is neither a WebP file nor base64-encoded WebP data.`,
    );
  }

  return { buffer: decoded, converted: true };
}

async function prepareLandingAssets() {
  for (const filename of LANDING_ASSETS) {
    const assetPath = path.join(landingDirectory, filename);
    const source = await readFile(assetPath);
    const prepared = decodePackagedWebP(source, filename);

    if (prepared.converted) {
      await writeFile(assetPath, prepared.buffer);
    }
  }
}

await prepareLandingAssets();
