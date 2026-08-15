import type {
  ContextRequest,
  ContextSourceResult,
  OriginPackageItem,
  OriginPackageSource,
} from "../ports";

export interface AcceptedOriginPackageRecord {
  householdId: string;
  childProfileId: string;
  originConcept: string;
  startingLocation: string;
  homeArchetype: string;
  nearbyNpcSeed: string;
  firstMysterySeed: string;
  universeSeed: string;
  toneVector: string[];
  noveltyMarkers: string[];
}

export interface AcceptedOriginPackageReader {
  findAcceptedByChildProfile(
    childProfileId: string,
    householdId: string,
  ): Promise<AcceptedOriginPackageRecord | null>;
}

export class PersistedOriginPackageSource implements OriginPackageSource {
  constructor(private readonly reader: AcceptedOriginPackageReader) {}

  async fetch(
    request: ContextRequest,
  ): Promise<ContextSourceResult<OriginPackageItem>> {
    const record = await this.reader.findAcceptedByChildProfile(
      request.childProfileId,
      request.householdId,
    );

    if (!record) return { items: [] };
    if (
      record.householdId !== request.householdId ||
      record.childProfileId !== request.childProfileId
    ) {
      return { items: [] };
    }

    return {
      items: [
        {
          originConcept: record.originConcept,
          startingLocation: record.startingLocation,
          homeArchetype: record.homeArchetype,
          nearbyNpcSeed: record.nearbyNpcSeed,
          firstMysterySeed: record.firstMysterySeed,
          universeSeed: record.universeSeed,
          toneVector: [...record.toneVector],
          noveltyMarkers: [...record.noveltyMarkers],
        },
      ],
    };
  }
}
