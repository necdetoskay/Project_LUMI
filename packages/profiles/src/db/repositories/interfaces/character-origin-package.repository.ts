import type {
  CharacterOriginPackageRecord,
  NewCharacterOriginPackageRecord,
} from "../../../db";

export interface CharacterOriginPackageRepository {
  findById(
    id: string,
    householdId: string,
  ): Promise<CharacterOriginPackageRecord | null>;

  listByChildProfile(
    childProfileId: string,
    householdId: string,
  ): Promise<CharacterOriginPackageRecord[]>;

  findLatestLlmBatch(
    childProfileId: string,
    householdId: string,
  ): Promise<CharacterOriginPackageRecord[]>;

  findAcceptedByChildProfile(
    childProfileId: string,
    householdId: string,
  ): Promise<CharacterOriginPackageRecord | null>;

  create(
    input: NewCharacterOriginPackageRecord,
  ): Promise<CharacterOriginPackageRecord>;

  markAccepted(
    id: string,
    householdId: string,
    childProfileId: string,
  ): Promise<CharacterOriginPackageRecord>;
}
