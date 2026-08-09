export const SCENE_NARRATIVE_MAX = 4000;
export const SCENE_USED_CONTINUITY_KEYS_MAX = 12;

export interface GeneratedScene {
  sceneId: string;
  setting: string;
  characters: string[];
  narrative: string;
  moment: string;
  nextPrompt: string | null;
  usedContinuityKeys?: string[];
}

export interface SceneOutputParseResult {
  scene: GeneratedScene | null;
  errors: string[];
}

function extractJsonFromResponse(raw: string): string {
  const trimmed = raw.trim();
  const codeMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (codeMatch) return codeMatch[1]!.trim();
  const braceStart = trimmed.indexOf("{");
  const braceEnd = trimmed.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
    return trimmed.slice(braceStart, braceEnd + 1);
  }
  return trimmed;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseUsedContinuityKeys(value: unknown, errors: string[]): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    errors.push("usedContinuityKeys: must be an array when provided");
    return [];
  }

  const keys: string[] = [];
  for (const entry of value) {
    const key = asString(entry);
    if (!key) {
      errors.push("usedContinuityKeys: entries must be non-empty strings");
      continue;
    }
    if (key.length > 120) {
      errors.push("usedContinuityKeys: entries must be at most 120 characters");
      continue;
    }
    if (!keys.includes(key)) keys.push(key);
  }

  if (keys.length > SCENE_USED_CONTINUITY_KEYS_MAX) {
    errors.push(
      `usedContinuityKeys: exceeds ${SCENE_USED_CONTINUITY_KEYS_MAX} entries`,
    );
  }

  return keys.slice(0, SCENE_USED_CONTINUITY_KEYS_MAX);
}

/**
 * Parses + validates an LLM scene output. Mirrors the origin-generator JSON
 * handling: extracts JSON (code fences tolerated), enforces the scene schema,
 * and bounds narrative length to SCENE_NARRATIVE_MAX (story_scenes stores
 * varchar(8000); generation uses 4000 headroom). Deterministic; never throws
 * on malformed input — errors are collected instead.
 */
export function parseAndValidateSceneOutput(
  raw: string,
): SceneOutputParseResult {
  const errors: string[] = [];

  let jsonStr: string;
  try {
    jsonStr = extractJsonFromResponse(raw);
  } catch {
    return {
      scene: null,
      errors: ["Failed to extract JSON from LLM response"],
    };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    return { scene: null, errors: ["Failed to parse LLM response as JSON"] };
  }

  const sceneId = asString(parsed["sceneId"]);
  const setting = asString(parsed["setting"]);
  const charactersRaw = parsed["characters"];
  const narrative = asString(parsed["narrative"]);
  const moment = asString(parsed["moment"]);
  const nextPrompt = asString(parsed["nextPrompt"]);
  const usedContinuityKeys = parseUsedContinuityKeys(
    parsed["usedContinuityKeys"],
    errors,
  );

  if (!sceneId) errors.push("sceneId: missing or not a string");
  if (!setting) errors.push("setting: missing or not a string");
  if (!Array.isArray(charactersRaw) || charactersRaw.length === 0) {
    errors.push("characters: must be a non-empty array");
  }
  if (!narrative) {
    errors.push("narrative: missing or not a string");
  } else if (narrative.length > SCENE_NARRATIVE_MAX) {
    errors.push(
      `narrative: exceeds ${SCENE_NARRATIVE_MAX} characters (got ${narrative.length})`,
    );
  }
  if (!moment) errors.push("moment: missing or not a string");

  if (errors.length > 0) {
    return { scene: null, errors };
  }

  return {
    scene: {
      sceneId: sceneId!,
      setting: setting!,
      characters: (charactersRaw as unknown[]).map(String).slice(0, 12),
      narrative: narrative!,
      moment: moment!,
      nextPrompt,
      usedContinuityKeys,
    },
    errors: [],
  };
}
