import {
  DrizzleCharacterOriginPackageRepository,
  getDatabase,
} from "../db";

export interface AcceptedOriginPackageContext {
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

export async function getAcceptedOriginPackageContext(
  childProfileId: string,
  householdId: string,
): Promise<AcceptedOriginPackageContext | null> {
  const databaseUrl =
    process.env.DATABASE_URL ??
    "postgresql://lumi:lumi_local_only@localhost:15432/lumi";
  const repository = new DrizzleCharacterOriginPackageRepository(
    getDatabase(databaseUrl),
  );
  const record = await repository.findAcceptedByChildProfile(
    childProfileId,
    householdId,
  );

  if (!record) return null;

  return {
    householdId: record.householdId,
    childProfileId: record.childProfileId,
    originConcept: record.payload.originConcept,
    startingLocation: record.payload.startingLocation,
    homeArchetype: record.payload.homeArchetype,
    nearbyNpcSeed: record.payload.nearbyNpcSeed,
    firstMysterySeed: record.payload.firstMysterySeed,
    universeSeed: record.universeSeed,
    toneVector: [...record.payload.toneVector],
    noveltyMarkers: [...record.payload.noveltyMarkers],
  };
}
