import type {
  HouseholdMemberRecord,
  HouseholdRecord,
  NewHouseholdMemberRecord,
  NewHouseholdRecord,
} from "../../schema/profile";

export interface HouseholdRepository {
  findById(id: string): Promise<HouseholdRecord | null>;

  findByIdForUser(id: string, userId: string): Promise<HouseholdRecord | null>;

  findByUserId(userId: string): Promise<(HouseholdRecord & { role: string })[]>;

  create(input: NewHouseholdRecord): Promise<HouseholdRecord>;

  softDelete(id: string, actorUserId: string): Promise<void>;

  addMember(input: NewHouseholdMemberRecord): Promise<void>;

  removeMember(householdId: string, userId: string): Promise<void>;

  getMembers(householdId: string): Promise<HouseholdMemberRecord[]>;

  isOwner(householdId: string, userId: string): Promise<boolean>;
}
