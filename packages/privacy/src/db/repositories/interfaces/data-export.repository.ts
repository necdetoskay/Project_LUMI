import type {
  DataExportRecord,
  NewDataExportRecord,
} from "../../schema/privacy";

export interface DataExportRepository {
  create(input: NewDataExportRecord): Promise<DataExportRecord>;
  listByChildProfile(
    childProfileId: string,
    householdId: string,
  ): Promise<DataExportRecord[]>;
}
