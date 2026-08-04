import { TextDecoder } from "node:util";

import type { ConsistencyFinding, SafetyFinding } from "../domain/findings";
import type { CharacterVisualIdentity } from "../domain/identity";
import type {
  MediaConsistencyValidatorPort,
  MediaSafetyValidatorPort,
} from "../ports/safety.port";

const FORBIDDEN_PROMPT_TERMS = [
  "harm",
  "weapon",
  "blood",
  "scar",
  "adult",
  "naked",
  "violence",
  "terror",
];

const FORBIDDEN_AUDIO_TERMS = ["scary", "scream", "loud", "alarm"];

export class StaticSafetyValidator implements MediaSafetyValidatorPort {
  validatePrompt(text: string): SafetyFinding[] {
    const findings: SafetyFinding[] = [];
    const normalized = text.toLowerCase();
    for (const term of FORBIDDEN_PROMPT_TERMS) {
      if (normalized.includes(term)) {
        findings.push({
          code: "CHILD_SAFETY-001",
          message: `Prompt contains forbidden term: ${term}`,
          severity: "error",
        });
      }
    }
    return findings;
  }

  validateImage(bytes: Uint8Array): SafetyFinding[] {
    if (bytes.byteLength === 0) {
      return [
        {
          code: "CONTENT-001",
          message: "Empty image payload",
          severity: "error",
        },
      ];
    }
    if (bytes.byteLength > 50 * 1024 * 1024) {
      return [
        {
          code: "CONTENT-002",
          message: "Image exceeds 50MB limit",
          severity: "error",
        },
      ];
    }
    return [];
  }

  validateAudio(bytes: Uint8Array): SafetyFinding[] {
    if (bytes.byteLength === 0) {
      return [
        {
          code: "CONTENT-001",
          message: "Empty audio payload",
          severity: "error",
        },
      ];
    }
    const text = new TextDecoder().decode(bytes);
    const findings: SafetyFinding[] = [];
    for (const term of FORBIDDEN_AUDIO_TERMS) {
      if (text.includes(term)) {
        findings.push({
          code: "CHILD_SAFETY-002",
          message: `Audio metadata contains forbidden term: ${term}`,
          severity: "error",
        });
      }
    }
    return findings;
  }
}

export class StaticConsistencyValidator
  implements MediaConsistencyValidatorPort
{
  validateImageAgainstIdentity(
    identity: CharacterVisualIdentity,
    bytes: Uint8Array,
  ): ConsistencyFinding[] {
    const text = new TextDecoder().decode(bytes);
    const findings: ConsistencyFinding[] = [];
    if (identity.traitHashes.length > 0) {
      for (const hash of identity.traitHashes) {
        if (!text.includes(hash)) {
          findings.push({
            code: "CONSISTENCY-001",
            message: `Character trait reference ${hash} missing from image metadata`,
            severity: "error",
          });
        }
      }
    }
    if (!text.includes(identity.referenceKey)) {
      findings.push({
        code: "CONSISTENCY-002",
        message: `Character identity reference ${identity.referenceKey} not found`,
        severity: "warn",
      });
    }
    return findings;
  }
}
