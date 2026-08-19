import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const WEB_ROOT = path.resolve(__dirname, "..");

function source(relativePath: string) {
  return fs.readFileSync(path.join(WEB_ROOT, relativePath), "utf8");
}

describe("premium landing real UI contract", () => {
  const page = source("app/page.tsx");
  const styles = source("app/landing-v2.module.css");

  it("renders the approved headline and real navigation actions", () => {
    expect(page).toContain("Her hikâye");
    expect(page).toContain("bir <span>dünyaya</span> dönüşür.");
    expect(page).toContain('href="/login"');
    expect(page).toContain('href="/register"');
  });

  it("uses clean standalone artwork instead of the old full-page screenshot", () => {
    expect(page).toContain('src="/landing/hero-world.webp"');
    expect(page).toContain("src={card.image}");
    expect(page).not.toContain("/api/landing-art");
    expect(styles).not.toContain("/api/landing-art");
    expect(styles).not.toContain("background-size: 100% 100%");
    expect(styles).not.toContain(".hitArea");
  });

  it("makes the portal an accessible interactive entry point", () => {
    expect(page).toContain("className={styles.portalLink}");
    expect(page).toContain('aria-label="Masal dünyasına gir"');
    expect(styles).toContain(".portalLink:hover");
    expect(styles).toContain(".portalLink:focus-visible");
    expect(styles).toContain("@keyframes portalRing");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("keeps four ambient story-universe themes around the page", () => {
    expect(page).toContain("cornerMechanical");
    expect(page).toContain("cornerFantasy");
    expect(page).toContain("cornerOcean");
    expect(page).toContain("cornerAnimals");
    expect(styles).toContain("/landing/corner-mechanical-fantasy.webp");
    expect(styles).toContain("/landing/corner-ocean-map.webp");
    expect(styles).toContain("/landing/corner-animals.webp");
  });

  it("keeps all three lower cards as real HTML content", () => {
    expect(page).toContain("Hikâyeni Başlat");
    expect(page).toContain("Keşfet & Yaşa");
    expect(page).toContain("Büyüt & Geliştir");
    expect(page).toContain("/landing/card-story.webp");
    expect(page).toContain("/landing/card-explore.webp");
    expect(page).toContain("/landing/card-grow.webp");
  });
});
