import type {
  AdventureHookCandidate,
  AdventureSourceFamily,
} from "./adventure-presentation";

const SOURCE_FAMILY_ORDER: AdventureSourceFamily[] = [
  "world_event",
  "rumor",
  "npc_call",
  "inventory_item",
];

export type AdventureFamilyDiagnostic = {
  sourceFamily: AdventureSourceFamily;
  available: boolean;
  reason: string | null;
};

export type AdventureCandidateSelection = {
  candidates: AdventureHookCandidate[];
  diagnostics: AdventureFamilyDiagnostic[];
  hasMoreUnseen: boolean;
};

function interleaveByFamily(
  candidates: AdventureHookCandidate[],
): AdventureHookCandidate[] {
  const buckets = new Map<AdventureSourceFamily, AdventureHookCandidate[]>();
  for (const family of SOURCE_FAMILY_ORDER) buckets.set(family, []);

  for (const candidate of candidates) {
    buckets.get(candidate.sourceFamily)?.push(candidate);
  }

  const result: AdventureHookCandidate[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const family of SOURCE_FAMILY_ORDER) {
      const candidate = buckets.get(family)?.shift();
      if (!candidate) continue;
      result.push(candidate);
      added = true;
    }
  }

  return result;
}

export function selectAdventureCandidateWindow(
  candidates: AdventureHookCandidate[],
  options: {
    page?: number;
    limit?: number;
    unavailableReasons?: Partial<Record<AdventureSourceFamily, string>>;
  } = {},
): AdventureCandidateSelection {
  const page = Math.max(0, options.page ?? 0);
  const limit = Math.max(1, options.limit ?? 6);
  const ordered = interleaveByFamily(candidates);
  const start = page * limit;
  const selected = ordered.slice(start, start + limit);

  const availableFamilies = new Set(
    candidates.map((item) => item.sourceFamily),
  );
  const diagnostics = SOURCE_FAMILY_ORDER.map((sourceFamily) => ({
    sourceFamily,
    available: availableFamilies.has(sourceFamily),
    reason: availableFamilies.has(sourceFamily)
      ? null
      : (options.unavailableReasons?.[sourceFamily] ??
        "No eligible canonical source is currently available."),
  }));

  return {
    candidates: selected,
    diagnostics,
    hasMoreUnseen: start + selected.length < ordered.length,
  };
}
