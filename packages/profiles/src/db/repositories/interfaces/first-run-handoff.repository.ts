import type {
  FirstRunHandoffPayload,
  FirstRunHandoffRecord,
  NewFirstRunHandoffRecord,
} from "../../../db";

export interface FirstRunHandoffRepository {
  findById(
    id: string,
    householdId: string,
  ): Promise<FirstRunHandoffRecord | null>;

  findLatestByChildProfile(
    childProfileId: string,
    householdId: string,
  ): Promise<FirstRunHandoffRecord | null>;

  listByChildProfile(
    childProfileId: string,
    householdId: string,
  ): Promise<FirstRunHandoffRecord[]>;

  create(input: NewFirstRunHandoffRecord): Promise<FirstRunHandoffRecord>;

  softDelete(id: string, householdId: string): Promise<void>;
}

export type { FirstRunHandoffPayload };
