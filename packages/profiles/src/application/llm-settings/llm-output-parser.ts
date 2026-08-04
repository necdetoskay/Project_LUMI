import {
  BROAD_CHARACTER_KINDS,
  CHARACTER_TYPES,
  TONE_VECTORS,
  validateBroadCharacterKind,
  validateOriginConcept,
  validateOriginDisplaySubtype,
} from "../../domain";

export interface ParsedLlmPackage {
  broadKind: string;
  characterType: string;
  subtype: string;
  originConcept: string;
  startingRegionArchetype: string;
  startingLocation: string;
  homeArchetype: string;
  nearbyNpcSeed: string;
  firstMysterySeed: string;
  toneVector: string[];
  noveltyMarkers: string[];
}

export interface LlmOutputParseResult {
  packages: ParsedLlmPackage[];
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

function validateLlmPackage(
  pkg: Record<string, unknown>,
  index: number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const prefix = `package[${index}]`;

  if (!pkg.broadKind || typeof pkg.broadKind !== "string") {
    errors.push(`${prefix}.broadKind: missing or not a string`);
  } else {
    try {
      validateBroadCharacterKind(pkg.broadKind);
    } catch {
      errors.push(
        `${prefix}.broadKind: invalid value "${pkg.broadKind}". Must be one of: ${BROAD_CHARACTER_KINDS.join(", ")}`,
      );
    }
  }

  if (!pkg.characterType || typeof pkg.characterType !== "string") {
    errors.push(`${prefix}.characterType: missing or not a string`);
  } else if (
    !(CHARACTER_TYPES as readonly string[]).includes(pkg.characterType)
  ) {
    errors.push(
      `${prefix}.characterType: invalid value "${pkg.characterType}". Must be one of: ${CHARACTER_TYPES.join(", ")}`,
    );
  }

  if (!pkg.subtype || typeof pkg.subtype !== "string") {
    errors.push(`${prefix}.subtype: missing or not a string`);
  } else {
    try {
      validateOriginDisplaySubtype(pkg.subtype);
    } catch {
      errors.push(`${prefix}.subtype: invalid length or format`);
    }
  }

  if (!pkg.originConcept || typeof pkg.originConcept !== "string") {
    errors.push(`${prefix}.originConcept: missing or not a string`);
  } else {
    try {
      validateOriginConcept(pkg.originConcept);
    } catch {
      errors.push(`${prefix}.originConcept: invalid length`);
    }
  }

  if (
    !pkg.startingRegionArchetype ||
    typeof pkg.startingRegionArchetype !== "string"
  ) {
    errors.push(`${prefix}.startingRegionArchetype: missing or not a string`);
  }

  if (!pkg.startingLocation || typeof pkg.startingLocation !== "string") {
    errors.push(`${prefix}.startingLocation: missing or not a string`);
  }

  if (!pkg.homeArchetype || typeof pkg.homeArchetype !== "string") {
    errors.push(`${prefix}.homeArchetype: missing or not a string`);
  }

  if (!pkg.nearbyNpcSeed || typeof pkg.nearbyNpcSeed !== "string") {
    errors.push(`${prefix}.nearbyNpcSeed: missing or not a string`);
  }

  if (!pkg.firstMysterySeed || typeof pkg.firstMysterySeed !== "string") {
    errors.push(`${prefix}.firstMysterySeed: missing or not a string`);
  }

  if (!Array.isArray(pkg.toneVector)) {
    errors.push(`${prefix}.toneVector: must be an array`);
  } else {
    for (const tone of pkg.toneVector) {
      if (!(TONE_VECTORS as readonly string[]).includes(tone)) {
        errors.push(`${prefix}.toneVector: invalid tone "${tone}"`);
      }
    }
  }

  if (!Array.isArray(pkg.noveltyMarkers) || pkg.noveltyMarkers.length < 1) {
    errors.push(`${prefix}.noveltyMarkers: must be a non-empty array`);
  }

  return { valid: errors.length === 0, errors };
}

export function parseAndValidateLlmOutput(raw: string): LlmOutputParseResult {
  const result: LlmOutputParseResult = { packages: [], errors: [] };

  let jsonStr: string;
  try {
    jsonStr = extractJsonFromResponse(raw);
  } catch {
    result.errors.push("Failed to extract JSON from LLM response");
    return result;
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    result.errors.push("Failed to parse LLM response as JSON");
    return result;
  }

  if (!parsed.packages || !Array.isArray(parsed.packages)) {
    result.errors.push('LLM response missing "packages" array');
    return result;
  }

  const pkgList = parsed.packages as Record<string, unknown>[];
  if (pkgList.length === 0) {
    result.errors.push("LLM returned empty packages array");
    return result;
  }

  const seenConcepts = new Set<string>();
  for (let i = 0; i < pkgList.length; i++) {
    const validation = validateLlmPackage(pkgList[i]!, i);
    if (validation.valid) {
      const concept = (pkgList[i]!.originConcept as string)
        .trim()
        .toLowerCase();
      if (seenConcepts.has(concept)) {
        result.errors.push(
          `package[${i}]: duplicate origin concept detected (redundant suggestion)`,
        );
        continue;
      }
      seenConcepts.add(concept);
      result.packages.push(pkgList[i] as unknown as ParsedLlmPackage);
    } else {
      result.errors.push(...validation.errors);
    }
  }

  return result;
}
