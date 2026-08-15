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

    if (!record) return { items: [], sourceRelevance: 0 };
    if (
      record.householdId !== request.householdId ||
      record.childProfileId !== request.childProfileId
    ) {
      return { items: [], sourceRelevance: 0 };
    }

    const content: OriginPackageItem = {
      originType: record.originConcept,
      dominantVectors: [...record.toneVector, ...record.noveltyMarkers],
      startingHome: `${record.startingLocation} — ${record.homeArchetype}`,
      nearbyNpcSeeds: [record.nearbyNpcSeed],
      firstMystery: record.firstMysterySeed,
    };

    return {
      items: [
        {
          id: `origin-package:${record.childProfileId}`,
          type: "origin-package",
          content,
          text: JSON.stringify({ ...content, universeSeed: record.universeSeed }),
          sourceEngine: "profiles/accepted-origin-package",
          authority: 0.95,
          confidence: 1,
          scope: "world_truth",
          priority: 2,
          relevance: 1,
        },
      ],
      sourceRelevance: 1,
    };
  }
}
