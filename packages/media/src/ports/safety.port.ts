import type { ConsistencyFinding, SafetyFinding } from "../domain/findings";
import type { CharacterVisualIdentity } from "../domain/identity";

export interface MediaSafetyValidatorPort {
  validatePrompt(text: string): SafetyFinding[];
  validateImage(bytes: Uint8Array): SafetyFinding[];
  validateAudio(bytes: Uint8Array): SafetyFinding[];
}

export interface MediaConsistencyValidatorPort {
  validateImageAgainstIdentity(
    identity: CharacterVisualIdentity,
    bytes: Uint8Array,
  ): ConsistencyFinding[];
}
