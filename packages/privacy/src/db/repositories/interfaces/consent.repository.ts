import type { ConsentRecord, NewConsentRecord } from "../../schema/privacy";

export interface ConsentRepository {
  findByHousehold(
    householdId: string,
    consentType?: string,
  ): Promise<ConsentRecord[]>;
  findByChildProfile(
    childProfileId: string,
    consentType?: string,
  ): Promise<ConsentRecord[]>;
  findById(consentId: string): Promise<ConsentRecord | null>;
  create(input: NewConsentRecord): Promise<ConsentRecord>;
  updateStatus(
    consentId: string,
    status: "granted" | "revoked",
    revokedAt: Date | null,
  ): Promise<ConsentRecord | null>;
}
