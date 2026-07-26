import type {
  ChildProfileRecord,
  NewChildProfileRecord,
} from "../../schema/profile";

export interface ChildProfileRepository {
  findById(id: string): Promise<ChildProfileRecord | null>;
  listByHousehold(
    householdId: string,
  ): Promise<ChildProfileRecord[]>;
  create(
    input: NewChildProfileRecord,
  ): Promise<ChildProfileRecord>;
}
