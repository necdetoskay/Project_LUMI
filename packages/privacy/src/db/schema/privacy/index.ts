export { privacySchema } from "../schemas";
export { primaryId, timestampColumns } from "./common";

export { consentRecords } from "./consent-records";
export type { ConsentRecord, NewConsentRecord } from "./consent-records";

export { dataLifecycleAuditLog } from "./data-lifecycle-audit-log";
export type {
  DataLifecycleAuditLogRecord,
  NewDataLifecycleAuditLogRecord,
} from "./data-lifecycle-audit-log";

export { dataExportRecords } from "./data-export-records";
export type { DataExportRecord, NewDataExportRecord } from "./data-export-records";
