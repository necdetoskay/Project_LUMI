import type {
  FirstRunHandoffConsumptionRecord,
  NewFirstRunHandoffConsumptionRecord,
} from "../../../db";

export interface HandoffConsumptionRepository {
  findByHandoffId(
    handoffId: string,
    householdId: string,
  ): Promise<FirstRunHandoffConsumptionRecord | null>;

  findByChildProfile(
    childProfileId: string,
    householdId: string,
  ): Promise<FirstRunHandoffConsumptionRecord[]>;

  create(
    input: NewFirstRunHandoffConsumptionRecord,
  ): Promise<FirstRunHandoffConsumptionRecord>;
}
