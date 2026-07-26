import type {
  HouseholdRecord,
  NewHouseholdRecord,
} from "../../schema/profile";

export interface HouseholdRepository {
  findById(id: string): Promise<HouseholdRecord | null>;
  create(input: NewHouseholdRecord): Promise<HouseholdRecord>;
  addMember(input: {
    householdId: string;
    userId: string;
    membershipRole: "owner" | "guardian" | "member";
  }): Promise<void>;
}
