import type {
  NewParentalSettingRecord,
  NewPolicyAuditLogRecord,
  ParentalSettingRecord,
  PolicyAuditLogRecord,
} from "../../schema/profile";

export interface ParentPolicyRepository {
  findByHousehold(
    householdId: string,
    actorUserId: string,
  ): Promise<ParentalSettingRecord | null>;

  upsert(
    input: NewParentalSettingRecord,
    actorUserId: string,
  ): Promise<ParentalSettingRecord>;

  appendAuditEntry(input: NewPolicyAuditLogRecord): Promise<void>;

  getAuditTrail(
    householdId: string,
    actorUserId: string,
  ): Promise<PolicyAuditLogRecord[]>;
}
