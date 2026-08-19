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
const MAX_DECODE_LAYERS = 5;
const BASE64_TEXT = /^[A-Za-z0-9+/=]+$/;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const landingDirectory = path.resolve(scriptDirectory, "../public/landing");

function isWebP(buffer) {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function decodePackagedWebP(source, filename) {
  let candidate = source;

  for (let layer = 0; layer <= MAX_DECODE_LAYERS; layer += 1) {
    if (isWebP(candidate)) {
      return { buffer: candidate, converted: layer > 0 };
    }

    const encoded = candidate.toString("utf8").replace(/\s+/g, "");
    if (!encoded || !BASE64_TEXT.test(encoded) || encoded.length % 4 !== 0) {
      break;
    }

    candidate = Buffer.from(encoded, "base64");
  }

  throw new Error(
    `[landing-assets] ${filename} did not resolve to valid RIFF/WEBP bytes after ${MAX_DECODE_LAYERS} base64 layers.`,
  );
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
