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
const maxDecodeLayers = 5;
const base64Text = /^[A-Za-z0-9+/=]+$/;

function isWebP(buffer: Buffer) {
  const riff = buffer.subarray(0, 4).toString("ascii");
  const webp = buffer.subarray(8, 12).toString("ascii");

  return buffer.length >= 12 && riff === "RIFF" && webp === "WEBP";
}

function unpackAsset(source: Buffer) {
  let candidate = source;

  for (let layer = 0; layer <= maxDecodeLayers; layer += 1) {
    if (isWebP(candidate)) {
      return candidate;
    }

    const text = candidate.toString("utf8");
    const encoded = text.replace(/\s+/g, "");
    if (!encoded || !base64Text.test(encoded) || encoded.length % 4 !== 0) {
      return candidate;
    }

    candidate = Buffer.from(encoded, "base64");
  }

  return candidate;
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

  it("prepares assets before dev and before production migration/build", () => {
    const packagePath = path.join(webRoot, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8")) as {
      scripts?: Record<string, string>;
    };
    const prepare = "node scripts/prepare-landing-assets.mjs";
    const migrate = "node scripts/vercel-production-ai-migrate.mjs";
    const dev = packageJson.scripts?.dev ?? "";
    const build = packageJson.scripts?.build ?? "";

    expect(dev).toBe(`${prepare} && next dev`);
    expect(build.startsWith(`${prepare} && `)).toBe(true);
    expect(build).toContain(`${migrate} && next build --webpack`);
    expect(build.indexOf(prepare)).toBeLessThan(build.indexOf(migrate));
  });
});
