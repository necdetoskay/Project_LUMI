import type { StoryHookState, HookType } from "./story-types";

/**
 * Typed, deterministic summary of a StoryHook's payload for the story
 * generation pipeline (S32). A hook carries a free-form jsonb payload; the
 * brief normalizes it into typed fields so the prompt builder (and later the
 * reader wiring) never reads raw payload keys. Unknown/missing fields degrade
 * to safe defaults and never throw.
 */
export interface HookSceneBrief {
  hookId: string;
  hookType: HookType;
  sourceNpcId: string;
  targetNpcId: string | null;
  /** Human-readable claim/message the hook wants the story to reflect. */
  claim: string;
  /** Item id (gift). */
  itemId: string | null;
  /** Fact id (rumor / quest_seed / information_share). */
  factId: string | null;
  /** Condition id (warning). */
  conditionId: string | null;
  /** Place / location claim (invitation / social_visit). */
  placeClaim: string | null;
  /** Free-form but bounded summary of any remaining payload fields. */
  payloadSummary: string;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function bounded(value: string | null, max = 2000): string {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function summarizePayload(payload: Record<string, unknown>): string {
  const keys = Object.keys(payload).filter(
    (k) =>
      !["claim", "itemId", "factId", "conditionId", "placeClaim"].includes(k),
  );
  if (keys.length === 0) return "";
  return keys
    .slice(0, 8)
    .map((k) => {
      const v = payload[k];
      if (typeof v === "string") return `${k}=${bounded(v, 80)}`;
      if (v === null || v === undefined) return `${k}=null`;
      try {
        return `${k}=${JSON.stringify(v).slice(0, 120)}`;
      } catch {
        return `${k}=?`;
      }
    })
    .join(", ");
}

/**
 * Builds a deterministic typed brief from a StoryHookState. Every hook type
 * maps its known payload fields; unknown fields are folded into a bounded
 * summary. Pure function (no I/O, no randomness).
 */
export function buildHookSceneBrief(hook: StoryHookState): HookSceneBrief {
  const payload = hook.payload ?? {};
  return {
    hookId: hook.id,
    hookType: hook.hookType,
    sourceNpcId: hook.sourceNpcId,
    targetNpcId: hook.targetNpcId,
    claim: asString(payload["claim"]) ?? "",
    itemId: asString(payload["itemId"]),
    factId: asString(payload["factId"]),
    conditionId: asString(payload["conditionId"]),
    placeClaim:
      asString(payload["placeClaim"]) ??
      asString(payload["placeFactId"]) ??
      asString(payload["targetNpcId"]),
    payloadSummary: summarizePayload(payload),
  };
}
