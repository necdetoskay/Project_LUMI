import type {
  ChildPreferenceRecord,
  ChildProfileRecord,
  NewChildPreferenceRecord,
  NewChildProfileRecord,
} from "../../schema/profile";

export interface ChildProfileRepository {
  findById(id: string, householdId: string): Promise<ChildProfileRecord | null>;

  listByHousehold(householdId: string): Promise<ChildProfileRecord[]>;

  create(input: NewChildProfileRecord): Promise<ChildProfileRecord>;

  update(
    id: string,
    householdId: string,
    input: Partial<NewChildProfileRecord>,
  ): Promise<ChildProfileRecord>;

  softDelete(id: string, householdId: string): Promise<void>;

  findPreferences(
    childProfileId: string,
    householdId: string,
  ): Promise<ChildPreferenceRecord | null>;

  upsertPreferences(
    householdId: string,
    input: NewChildPreferenceRecord,
  ): Promise<ChildPreferenceRecord>;
}
