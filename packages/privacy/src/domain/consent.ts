import { ValidationError } from "./errors";

export type ConsentType =
  | "content_generation"
  | "media_generation"
  | "voice_recording"
  | "data_processing";

export type ConsentStatus = "granted" | "revoked";

export const CONSENT_TYPES: readonly ConsentType[] = [
  "content_generation",
  "media_generation",
  "voice_recording",
  "data_processing",
];

export interface ConsentState {
  id: string;
  householdId: string;
  childProfileId: string | null;
  consentType: ConsentType;
  status: ConsentStatus;
  grantedAt: Date;
  revokedAt: Date | null;
  grantedBy: string;
}

export function assertConsentType(value: string): ConsentType {
  if (!CONSENT_TYPES.includes(value as ConsentType)) {
    throw new ValidationError(
      "INVALID_CONSENT_TYPE",
      `Unknown consent type '${value}'. Expected one of: ${CONSENT_TYPES.join(", ")}`,
    );
  }
  return value as ConsentType;
}

export function grantConsent(
  state: Omit<ConsentState, "status" | "revokedAt">,
): ConsentState {
  return {
    ...state,
    status: "granted",
    revokedAt: null,
  };
}

export function revokeConsent(
  state: ConsentState,
  revokedAt: Date,
): ConsentState {
  if (state.status === "revoked") {
    throw new ValidationError(
      "CONSENT_ALREADY_REVOKED",
      "Consent record is already revoked",
    );
  }
  return {
    ...state,
    status: "revoked",
    revokedAt,
  };
}
