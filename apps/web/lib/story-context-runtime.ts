import {
  CanonicalMemoryRetrievalAdapter,
  NoCanonicalKnowledgeSource,
  NoPersistedParentPolicySource,
  PersistedEmotionalStateSource,
  PersistedOriginPackageSource,
  RequestSnapshotWorkingStorySource,
  RetrievalLongTermMemorySource,
  RetrievalWorldEventSource,
  SystemSafetyPolicySource,
  WorldEventRetrievalAdapter,
  createStoryGenerationContextComposer,
  type EmotionalStateItem,
  type StoryGenerationContextComposer,
  type WorkingStoryItem,
} from "@lumi/context";
import { DrizzleCanonicalMemoryRepository } from "@lumi/npc-intelligence";
import { getAcceptedOriginPackageContext } from "@lumi/profiles/application";
import { DrizzleWorldEventReader, getDatabase } from "@lumi/world";

export interface StoryContextRuntimeReaders {
  readWorkingStory: (
    request: Parameters<RequestSnapshotWorkingStorySource["fetch"]>[0],
  ) => Promise<WorkingStoryItem | null> | WorkingStoryItem | null;
  readEmotionalState: (
    request: Parameters<PersistedEmotionalStateSource["fetch"]>[0],
  ) => Promise<EmotionalStateItem[]> | EmotionalStateItem[];
}

/**
 * Web production composition root for story-generation context.
 *
 * Persisted authorities are owned by their domain packages. Request/session
 * state remains owned by the caller and is supplied through explicit readers.
 * Missing parent-policy and knowledge authorities have explicit production
 * semantics and must not be replaced with in-memory fixture data.
 */
export function createProductionStoryContextComposer(
  readers: StoryContextRuntimeReaders,
): StoryGenerationContextComposer {
  const memoryRepository = new DrizzleCanonicalMemoryRepository();
  const memoryRetrieval = new CanonicalMemoryRetrievalAdapter(memoryRepository);

  const databaseUrl =
    process.env.DATABASE_URL ??
    "postgresql://lumi:lumi_local_only@localhost:15432/lumi";
  const worldEventReader = new DrizzleWorldEventReader(
    getDatabase(databaseUrl),
  );
  const worldRetrieval = new WorldEventRetrievalAdapter(worldEventReader);
  const originPackageSource = new PersistedOriginPackageSource({
    findAcceptedByChildProfile: getAcceptedOriginPackageContext,
  });

  return createStoryGenerationContextComposer({
    safetyPolicySource: new SystemSafetyPolicySource(),
    parentPolicySource: new NoPersistedParentPolicySource(),
    workingStorySource: new RequestSnapshotWorkingStorySource(
      readers.readWorkingStory,
    ),
    emotionalStateSource: new PersistedEmotionalStateSource(
      readers.readEmotionalState,
    ),
    longTermMemorySource: new RetrievalLongTermMemorySource(memoryRetrieval),
    knowledgeSource: new NoCanonicalKnowledgeSource(),
    worldSource: new RetrievalWorldEventSource(worldRetrieval),
    originPackageSource,
  });
}
