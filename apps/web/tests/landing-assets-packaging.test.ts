import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const webRoot = path.resolve(__dirname, "..");
const landingDir = path.join(webRoot, "public/landing");
const assets = [
  "hero-world.webp",
  "card-story.webp",
  "card-explore.webp",
  "card-grow.webp",
  "corner-mechanical-fantasy.webp",
  "corner-ocean-map.webp",
  "corner-animals.webp",
] as const;

function isWebP(buffer: Buffer) {
  const riff = buffer.subarray(0, 4).toString("ascii");
  const webp = buffer.subarray(8, 12).toString("ascii");

  return buffer.length >= 12 && riff === "RIFF" && webp === "WEBP";
}

function unpackAsset(source: Buffer) {
  if (isWebP(source)) {
    return source;
  }

  const text = source.toString("utf8");
  const encoded = text.replace(/\s+/g, "");

  return Buffer.from(encoded, "base64");
}

describe("landing asset packaging", () => {
  for (const filename of assets) {
    it(`packages ${filename} as decodable WebP data`, () => {
      const assetPath = path.join(landingDir, filename);
      const source = fs.readFileSync(assetPath);
      const decoded = unpackAsset(source);

      expect(isWebP(decoded)).toBe(true);
      expect(decoded.byteLength).toBeGreaterThan(1024);
    });
  }

  it("prepares assets before dev and build", () => {
    const packagePath = path.join(webRoot, "package.json");
    const packageJson = fs.readFileSync(packagePath, "utf8");
    const prepare = "node scripts/prepare-landing-assets.mjs";

    expect(packageJson).toContain(`${prepare} && next dev`);
    expect(packageJson).toContain(`${prepare} && next build --webpack`);
  });
});
