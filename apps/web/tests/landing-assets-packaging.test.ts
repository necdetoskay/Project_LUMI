import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const WEB_ROOT = path.resolve(__dirname, "..");
const LANDING_DIR = path.join(WEB_ROOT, "public/landing");
const ASSETS = [
  "hero-world.webp",
  "card-story.webp",
  "card-explore.webp",
  "card-grow.webp",
  "corner-mechanical-fantasy.webp",
  "corner-ocean-map.webp",
  "corner-animals.webp",
] as const;

function isWebP(buffer: Buffer) {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function unpackAsset(source: Buffer) {
  if (isWebP(source)) return source;
  return Buffer.from(
    source.toString("utf8").replace(/\s+/g, ""),
    "base64",
  );
}

describe("landing asset packaging", () => {
  it.each(ASSETS)("packages %s as decodable WebP data", (filename) => {
    const source = fs.readFileSync(path.join(LANDING_DIR, filename));
    const decoded = unpackAsset(source);

    expect(isWebP(decoded)).toBe(true);
    expect(decoded.byteLength).toBeGreaterThan(1024);
  });

  it("prepares packaged assets before dev and production build", () => {
    const packageJson = fs.readFileSync(
      path.join(WEB_ROOT, "package.json"),
      "utf8",
    );

    expect(packageJson).toContain(
      "node scripts/prepare-landing-assets.mjs && next dev",
    );
    expect(packageJson).toContain(
      "node scripts/prepare-landing-assets.mjs && next build --webpack",
    );
  });
});
