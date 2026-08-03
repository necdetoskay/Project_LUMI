import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { resolve, dirname, join, extname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
const ROOT = resolve(__dir, "../../..");

const EXCLUDE_DIRS = new Set([
  "node_modules", ".next", "dist", "coverage", ".git", ".turbo",
  "target", "build", ".vercel",
]);

const BINARY_EXTS = new Set([
  ".ico", ".png", ".jpg", ".jpeg", ".gif", ".svg",
  ".woff", ".woff2", ".eot", ".ttf", ".otf",
  ".pdf", ".zip", ".gz", ".lock", ".docx", ".xlsx", ".pptx",
]);

const TEXT_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".md", ".mdx", ".yml", ".yaml", ".toml",
  ".sql", ".css", ".scss", ".html", ".env", ".txt",
]);

// Patterns computed at runtime to avoid literal mojibake in source
type ScanIssue = { msg: string; line?: number; context?: string };
type ScanResult = { ok: boolean; errors: ScanIssue[] };

const BAD_PATTERNS = [
  { pattern: String.fromCodePoint(0xc3), label: "LITERAL_ATILDE" },
  { pattern: String.fromCodePoint(0xc4), label: "LITERAL_ADIAERESIS" },
  { pattern: String.fromCodePoint(0xc5), label: "LITERAL_ARING" },
];

function scanFile(filePath: string): ScanResult {
  const raw = readFileSync(filePath);
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    return { ok: false, errors: [{ msg: "NOT_UTF8" }] };
  }
  const errors: ScanIssue[] = [];
  if (raw[0] === 0xef && raw.byteLength > 2 && raw[1] === 0xbb && raw[2] === 0xbf) {
    errors.push({ msg: "UTF8_BOM" });
  }
  const lines = text.split(/\r?\n/);
  for (let ln = 0; ln < lines.length; ln++) {
    const line = lines[ln] ?? "";
    for (const bp of BAD_PATTERNS) {
      if (line.includes(bp.pattern)) {
        errors.push({ msg: bp.label, line: ln + 1, context: line.slice(0, 80).replace(/\n/g, "\\n") });
      }
    }
    if (line.includes("\u00e2\u20ac")) {
      errors.push({ msg: "MOJI_EMDASH", line: ln + 1, context: line.slice(0, 80).replace(/\n/g, "\\n") });
    }
  }
  return { ok: errors.length === 0, errors };
}

describe("mojibake regression (repo-wide)", () => {
  it("scans apps, packages, docs for mojibake patterns", { timeout: 30000 }, () => {
    const allIssues: string[] = [];
    const targets = ["apps", "packages", "docs"];

    function walk(dir: string): void {
      let entries: string[];
      try {
        entries = readdirSync(dir);
      } catch {
        return;
      }
      for (const entry of entries) {
        if (EXCLUDE_DIRS.has(entry) || entry.startsWith(".")) continue;
        const full = join(dir, entry);
        let stats;
        try {
          stats = statSync(full);
        } catch {
          continue;
        }
        if (stats.isDirectory()) {
          walk(full);
        } else if (stats.isFile()) {
          const ext = extname(entry).toLowerCase();
          if (BINARY_EXTS.has(ext) || (!TEXT_EXTS.has(ext) && ext !== "")) continue;
          if (stats.size === 0) continue;
          const result = scanFile(full);
          if (!result.ok) {
            const rel = full.replace(ROOT, "").replace(/\\/g, "/");
            for (const e of result.errors) {
              const loc = e.line ? `${rel}:${e.line}` : `${rel}:1`;
              allIssues.push(`${loc} [${e.msg}] ${e.context || ""}`);
            }
          }
        }
      }
    }

    for (const t of targets) {
      walk(join(ROOT, t));
    }

    if (allIssues.length > 0) {
      console.error("\nMojibake issues found (" + allIssues.length + " total):");
      for (const issue of allIssues) {
        console.error("  " + issue);
      }
    }
    expect(allIssues).toEqual([]);
  });
});

