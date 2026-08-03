#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

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

// Bad mojibake patterns: Latin-1 range chars that only appear in mojibake
// when Turkish text is double-encoded. These are the LITERAL characters,
// not the correct Turkish equivalents.
// Â (U+00C2) is deliberately excluded because it is a legitimate
// Turkish character in words like mekân, hikâye, kâr, hâlâ.
const BAD_PATTERNS = [
  { pattern: "\u00c3", label: "LITERAL_ATILDE (Ã)" },
  { pattern: "\u00c4", label: "LITERAL_ADIAERESIS (Ä)" },
  { pattern: "\u00c5", label: "LITERAL_ARING (Å)" },
];

const MOJI_EMDASH = "\u00e2\u20ac";  // â + € = double-encoded em dash

let foundAny = false;

function walk(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry) || entry.startsWith(".")) continue;
    const fullPath = join(dir, entry);
    let stats;
    try { stats = statSync(fullPath); } catch { continue; }
    if (stats.isDirectory()) { walk(fullPath); }
    else if (stats.isFile()) { checkFile(fullPath, entry); }
  }
}

function checkFile(filePath, fname) {
  const ext = extname(filePath).toLowerCase();
  if (BINARY_EXTS.has(ext)) return;
  if (!TEXT_EXTS.has(ext) && ext !== "") return;

  let raw;
  try { raw = readFileSync(filePath); } catch { return; }
  if (raw.length === 0) return;

  const rel = filePath.replace(ROOT, "").replace(/\\/g, "/");

  // Validate UTF-8 by trying to decode
  let text;
  try {
    text = decodeUTF8(raw);
  } catch (e) {
    const hex = raw.slice(0, 40).toString("hex");
    console.log(`${rel}:1 [NOT_UTF8] ${e.message} (${raw.length} bytes, hex: ${hex})`);
    foundAny = true;
    return;
  }

  // Check BOM
  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) {
    console.log(`${rel}:1 [UTF8_BOM] File has UTF-8 BOM`);
    foundAny = true;
  }

  const lines = text.split(/\r?\n/);
  for (let ln = 0; ln < lines.length; ln++) {
    const line = lines[ln];

    for (const bp of BAD_PATTERNS) {
      let idx = 0;
      while ((idx = line.indexOf(bp.pattern, idx)) !== -1) {
        const start = Math.max(0, idx - 5);
        const end = Math.min(line.length, idx + bp.pattern.length + 15);
        const ctx = line.slice(start, end).replace(/\n/g, "\\n");
        console.log(`${rel}:${ln + 1} [${bp.label}] ...${ctx}...`);
        foundAny = true;
        idx += bp.pattern.length;
      }
    }

    let emIdx = 0;
    while ((emIdx = line.indexOf(MOJI_EMDASH, emIdx)) !== -1) {
      const start = Math.max(0, emIdx - 5);
      const end = Math.min(line.length, emIdx + 6 + 15);
      const ctx = line.slice(start, end).replace(/\n/g, "\\n");
      console.log(`${rel}:${ln + 1} [MOJI_EMDASH] ...${ctx}...`);
      foundAny = true;
      emIdx += 2;
    }
  }
}

function decodeUTF8(buf) {
  // Manual UTF-8 decoder for maximum compatibility
  const chars = [];
  const len = buf.length;
  let i = 0;
  while (i < len) {
    const b = buf[i];
    if (b < 0x80) {
      chars.push(b);
      i++;
    } else if (b >= 0xc2 && b <= 0xdf) {
      if (i + 1 >= len) throw new Error(`Truncated 2-byte sequence at offset ${i}`);
      const b2 = buf[i + 1];
      if (b2 < 0x80 || b2 > 0xbf) throw new Error(`Invalid continuation byte at offset ${i + 1}`);
      const cp = ((b & 0x1f) << 6) | (b2 & 0x3f);
      chars.push(cp);
      i += 2;
    } else if (b >= 0xe0 && b <= 0xef) {
      if (i + 2 >= len) throw new Error(`Truncated 3-byte sequence at offset ${i}`);
      const b2 = buf[i + 1];
      const b3 = buf[i + 2];
      if (b2 < 0x80 || b2 > 0xbf || b3 < 0x80 || b3 > 0xbf) throw new Error(`Invalid continuation byte at offset ${i + 1}`);
      const cp = ((b & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
      chars.push(cp);
      i += 3;
    } else if (b >= 0xf0 && b <= 0xf4) {
      if (i + 3 >= len) throw new Error(`Truncated 4-byte sequence at offset ${i}`);
      const b2 = buf[i + 1];
      const b3 = buf[i + 2];
      const b4 = buf[i + 3];
      if (b2 < 0x80 || b2 > 0xbf || b3 < 0x80 || b3 > 0xbf || b4 < 0x80 || b4 > 0xbf)
        throw new Error(`Invalid continuation byte at offset ${i + 1}`);
      const cp = ((b & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f);
      chars.push(cp);
      i += 4;
    } else {
      throw new Error(`Invalid UTF-8 leading byte 0x${b.toString(16)} at offset ${i}`);
    }
  }
  return String.fromCodePoint(...chars);
}

// Scan
const targets = ["apps", "packages", "docs", "README.md"];
for (const t of targets) {
  const full = join(ROOT, t);
  try {
    if (statSync(full).isDirectory()) walk(full);
    else checkFile(full, t);
  } catch { /* skip missing */ }
}

if (foundAny) {
  console.log("\nFAIL: Mojibake patterns found. Fix them and re-run.");
  process.exit(1);
} else {
  console.log("PASS: No mojibake patterns detected.");
  process.exit(0);
}
