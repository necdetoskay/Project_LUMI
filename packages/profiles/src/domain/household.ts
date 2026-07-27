import { validateHouseholdName, validateSlug } from "./validation";
import type { MembershipRole } from "./types";
import { ValidationError } from "./errors";

export interface HouseholdState {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface HouseholdMemberState {
  householdId: string;
  userId: string;
  membershipRole: MembershipRole;
  isActive: boolean;
  joinedAt: Date;
}

export class Household {
  private state: HouseholdState;
  private readonly members: Map<string, HouseholdMemberState>;

  private constructor(state: HouseholdState, members: HouseholdMemberState[] = []) {
    this.state = { ...state };
    this.members = new Map(members.map((m) => [m.userId, { ...m }]));
  }

  static create(input: {
    id: string;
    name: string;
    slug: string;
  }): Household {
    const name = validateHouseholdName(input.name);
    const slug = validateSlug(input.slug);

    return new Household({
      id: input.id,
      name,
      slug,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  }

  static fromState(
    state: HouseholdState,
    members?: HouseholdMemberState[],
  ): Household {
    return new Household(state, members);
  }

  getState(): HouseholdState {
    return { ...this.state };
  }

  getMembers(): HouseholdMemberState[] {
    return Array.from(this.members.values());
  }

  getMember(userId: string): HouseholdMemberState | undefined {
    return this.members.get(userId);
  }

  hasActiveMember(userId: string): boolean {
    const member = this.members.get(userId);
    return member !== undefined && member.isActive;
  }

  isOwner(userId: string): boolean {
    const member = this.members.get(userId);
    return member !== undefined && member.membershipRole === "owner" && member.isActive;
  }

  addMember(input: {
    userId: string;
    membershipRole: MembershipRole;
  }): void {
    if (this.state.deletedAt) {
      throw new ValidationError(
        "HOUSEHOLD_ARCHIVED",
        "Cannot add members to an archived household",
      );
    }
    if (this.members.has(input.userId)) {
      throw new ValidationError(
        "MEMBER_ALREADY_EXISTS",
        "User is already a member of this household",
      );
    }
    this.members.set(input.userId, {
      householdId: this.state.id,
      userId: input.userId,
      membershipRole: input.membershipRole,
      isActive: true,
      joinedAt: new Date(),
    });
    this.state.updatedAt = new Date();
  }

  removeMember(userId: string): void {
    if (!this.members.has(userId)) {
      throw new ValidationError(
        "MEMBER_NOT_FOUND",
        "User is not a member of this household",
      );
    }
    this.members.delete(userId);
    this.state.updatedAt = new Date();
  }

  archive(): void {
    this.state.deletedAt = new Date();
  }

  isArchived(): boolean {
    return this.state.deletedAt !== null;
  }

  updateName(name: string): void {
    this.state.name = validateHouseholdName(name);
    this.state.updatedAt = new Date();
  }
}
