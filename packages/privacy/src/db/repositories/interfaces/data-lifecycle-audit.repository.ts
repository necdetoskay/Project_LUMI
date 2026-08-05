import type {
  DataLifecycleAuditLogRecord,
  NewDataLifecycleAuditLogRecord,
} from "../../schema/privacy";

export interface DataLifecycleAuditRepository {
  append(input: NewDataLifecycleAuditLogRecord): Promise<void>;
  listByHousehold(householdId: string): Promise<DataLifecycleAuditLogRecord[]>;
}
