import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  symlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const standalone = join(root, "apps/web/.next/standalone");
const storeRoot = join(root, "node_modules/.pnpm");
const targetStore = join(standalone, "node_modules/.pnpm");
const webNodeModules = join(standalone, "apps/web/node_modules");

const targets = ["postgres", "drizzle-orm"];

for (const name of targets) {
  const pkgDirs = readdirSync(storeRoot).filter((dir) =>
    dir.startsWith(name + "@"),
  );
  if (pkgDirs.length === 0) {
    console.warn(`[inject] ${name}: not found in store, skipping`);
    continue;
  }

  for (const dir of pkgDirs) {
    const src = join(storeRoot, dir);
    const dest = join(targetStore, dir);
    if (!existsSync(dest)) {
      mkdirSync(dirname(dest), { recursive: true });
      cpSync(src, dest, { recursive: true });
    }
  }

  const hubDir = join(targetStore, "node_modules", name);
  if (!existsSync(hubDir) || readdirSync(hubDir).length === 0) {
    const realPkg = pkgDirs
      .map((dir) => join(targetStore, dir, "node_modules", name))
      .find((p) => existsSync(p));
    if (realPkg) {
      mkdirSync(dirname(hubDir), { recursive: true });
      symlinkSync(realPkg, hubDir, "junction");
    }
  }

  const webLink = join(webNodeModules, name);
  if (!existsSync(webLink)) {
    const realPkg = pkgDirs
      .map((dir) => join(targetStore, dir, "node_modules", name))
      .find((p) => existsSync(p));
    if (realPkg) {
      mkdirSync(webNodeModules, { recursive: true });
      const rel = join("../../../node_modules/.pnpm/node_modules", name);
      symlinkSync(rel, webLink, "junction");
    }
  }
}

console.log("[inject] standalone deps injected:", targets.join(", "));
