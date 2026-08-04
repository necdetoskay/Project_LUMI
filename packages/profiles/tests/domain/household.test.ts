import { describe, it, expect } from "vitest";
import { Household } from "../../src/domain/household";
import { ValidationError } from "../../src/domain/errors";

describe("Household", () => {
  const validInput = {
    id: crypto.randomUUID(),
    name: "My Family",
    slug: "my-family",
  };

  it("creates a household with valid input", () => {
    const household = Household.create(validInput);
    const state = household.getState();
    expect(state.name).toBe("My Family");
    expect(state.slug).toBe("my-family");
    expect(state.deletedAt).toBeNull();
  });

  it("rejects empty name", () => {
    expect(() => Household.create({ ...validInput, name: "   " })).toThrow(
      ValidationError,
    );
  });

  it("rejects name over 160 characters", () => {
    expect(() =>
      Household.create({ ...validInput, name: "x".repeat(161) }),
    ).toThrow(ValidationError);
  });

  it("rejects invalid slug", () => {
    expect(() =>
      Household.create({ ...validInput, slug: "UPPERCASE" }),
    ).toThrow(ValidationError);
  });

  it("rejects slug with spaces", () => {
    expect(() =>
      Household.create({ ...validInput, slug: "my family" }),
    ).toThrow(ValidationError);
  });

  it("rejects empty slug", () => {
    expect(() => Household.create({ ...validInput, slug: "x" })).toThrow(
      ValidationError,
    );
  });

  it("supports archive", () => {
    const household = Household.create(validInput);
    expect(household.isArchived()).toBe(false);
    household.archive();
    expect(household.isArchived()).toBe(true);
    expect(household.getState().deletedAt).toBeInstanceOf(Date);
  });

  it("manages members", () => {
    const household = Household.create(validInput);
    const userId = crypto.randomUUID();

    household.addMember({ userId, membershipRole: "owner" });
    expect(household.hasActiveMember(userId)).toBe(true);
    expect(household.isOwner(userId)).toBe(true);

    household.removeMember(userId);
    expect(household.hasActiveMember(userId)).toBe(false);
  });

  it("prevents duplicate member", () => {
    const household = Household.create(validInput);
    const userId = crypto.randomUUID();

    household.addMember({ userId, membershipRole: "member" });
    expect(() =>
      household.addMember({ userId, membershipRole: "guardian" }),
    ).toThrow(ValidationError);
  });

  it("prevents adding members to archived household", () => {
    const household = Household.create(validInput);
    household.archive();
    expect(() =>
      household.addMember({
        userId: crypto.randomUUID(),
        membershipRole: "member",
      }),
    ).toThrow(ValidationError);
  });

  it("reconstructs from saved state", () => {
    const original = Household.create(validInput);
    const state = original.getState();
    const members = original.getMembers();

    const restored = Household.fromState(state, members);
    expect(restored.getState().name).toBe("My Family");
    expect(restored.getState().slug).toBe("my-family");
  });

  it("updates name", () => {
    const household = Household.create(validInput);
    household.updateName("Updated Family");
    expect(household.getState().name).toBe("Updated Family");
  });
});
