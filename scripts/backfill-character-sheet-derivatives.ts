#!/usr/bin/env node
/**
 * Backfills seven-view sheet derivatives for character_reference_sheet assets.
 *
 * Usage:
 *   pnpm assets:backfill-sheets -- --dry-run
 *   pnpm assets:backfill-sheets -- --apply
 *   pnpm assets:backfill-sheets -- --apply --character-id <uuid>
 *   pnpm assets:backfill-sheets -- --apply --household-id <uuid>
 *   pnpm assets:backfill-sheets -- --apply --limit 50
 *
 * The script is idempotent: it only creates derivatives that are missing for a
 * source sheet. Source sheets are never deleted or modified; binary cleanup is
 * a separate retention phase.
 */
import { argv } from "node:process";

import { CharacterVisualBackfillService } from "@lumi/profiles/application";
import { DrizzleCharacterVisualBackfillStore } from "@lumi/profiles/adapters";

import {
  createCharacterVisualStorageAdapter,
  readCharacterVisual,
} from "../apps/web/lib/assets/character-visual-storage";
import { PureJsCharacterReferenceSheetDerivativeAdapter } from "../apps/web/lib/assets/character-visual-sheet-splitter";

function parseArgs(args: string[]) {
  const flags = new Set<string>();
  const values: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run" || arg === "--apply") {
      flags.add(arg.slice(2));
      continue;
    }
    if (
      arg === "--character-id" ||
      arg === "--household-id" ||
      arg === "--limit"
    ) {
      values[arg.slice(2)] = args[index + 1]!;
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      flags.add("help");
    }
  }
  return { flags, values };
}

function usage(): string {
  return [
    "Backfill missing seven-view derivatives for character reference sheets.",
    "",
    "Usage:",
    "  pnpm assets:backfill-sheets -- --dry-run",
    "  pnpm assets:backfill-sheets -- --apply",
    "  pnpm assets:backfill-sheets -- --apply --character-id <uuid>",
    "  pnpm assets:backfill-sheets -- --apply --household-id <uuid>",
    "  pnpm assets:backfill-sheets -- --apply --limit 50",
    "",
    "Options:",
    "  --dry-run          Report missing derivatives without writing anything.",
    "  --apply            Create missing derivatives (storage + asset rows).",
    "  --character-id     Restrict to a single character.",
    "  --household-id     Restrict to a single household.",
    "  --limit            Maximum number of source sheets to scan (default 1000).",
  ].join("\n");
}

async function main(): Promise<void> {
  const { flags, values } = parseArgs(argv.slice(2));

  if (flags.has("help")) {
    console.log(usage());
    return;
  }

  if (flags.has("dry-run") && flags.has("apply")) {
    throw new Error("Use exactly one of --dry-run or --apply.");
  }
  const mode: "dry-run" | "apply" = flags.has("apply") ? "apply" : "dry-run";

  const service = new CharacterVisualBackfillService({
    store: new DrizzleCharacterVisualBackfillStore(),
    storage: {
      read: async (storageRef) => {
        const read = await readCharacterVisual(storageRef);
        return { bytes: Buffer.from(read.bytes), mimeType: read.mimeType };
      },
      store: (input) => createCharacterVisualStorageAdapter().store(input),
    },
    splitter: new PureJsCharacterReferenceSheetDerivativeAdapter(),
  });

  const summary = await service.run({
    mode,
    ...(values["character-id"] ? { characterId: values["character-id"] } : {}),
    ...(values["household-id"] ? { householdId: values["household-id"] } : {}),
    ...(values.limit ? { limit: Number(values.limit) } : {}),
  });

  console.log(JSON.stringify({ mode, ...summary }, null, 2));
  if (mode === "apply") {
    console.log(
      `Created ${summary.createdDerivativeCount} derivative(s) across ${summary.details.length} source sheet(s).`,
    );
  } else {
    console.log(
      `Dry-run: ${summary.missingDerivativeCount} derivative(s) are missing across ${summary.details.length} source sheet(s).`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
