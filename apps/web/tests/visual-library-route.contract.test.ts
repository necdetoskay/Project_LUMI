import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const assetsRoutePath = path.resolve(__dirname, "../app/app/assets");
const pagePath = path.join(assetsRoutePath, "page.tsx");

describe("Visual Library canonical route contract", () => {
  it("uses one unversioned visual library implementation", () => {
    const routeFiles = fs.readdirSync(assetsRoutePath);
    const pageSource = fs.readFileSync(pagePath, "utf8");

    expect(routeFiles).toContain("visual-library.tsx");
    expect(routeFiles).not.toContain("visual-library-v2.tsx");
    expect(routeFiles).not.toContain("visual-library-v3.tsx");
    expect(routeFiles).not.toContain("assets-client-page.tsx");
    expect(pageSource).toContain('from "./visual-library"');
    expect(pageSource).not.toMatch(/visual-library-v\d+/);
  });
});
