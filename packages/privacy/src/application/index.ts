export {
  appendLifecycleAudit,
  getLifecycleAuditTrail,
} from "./lifecycle-audit.service";
export type { LifecycleAuditEntry } from "./lifecycle-audit.service";

export {
  listConsents,
  listConsentsForChild,
  grantConsentForHousehold,
  revokeConsentForHousehold,
} from "./consent.service";
export type {
  ConsentResult,
  GrantConsentInput,
} from "./consent.service";

export {
  exportChildData,
  listExportsForChild,
} from "./export.service";
export type { ExportResult } from "./export.service";

export {
  archiveChildData,
} from "./archive.service";
export type { ArchiveChildDataResult } from "./archive.service";
