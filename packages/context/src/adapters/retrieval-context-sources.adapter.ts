import { worldToContextItems } from "../application/world-context-mapper";
import type {
  ContextItem,
  ContextRetrievalSource,
  ContextSourceResult,
  LongTermMemoryItem,
  LongTermMemorySource,
  RetrievalCandidate,
  WorldItem,
  WorldSource,
  ContextRequest,
} from "../ports";

const DEFAULT_RETRIEVAL_LIMIT = 12;

export class RetrievalLongTermMemorySource implements LongTermMemorySource {
  constructor(
    private readonly retrieval: ContextRetrievalSource,
    private readonly limit = DEFAULT_RETRIEVAL_LIMIT,
  ) {}

  async fetch(request: ContextRequest): Promise<ContextSourceResult<LongTermMemoryItem>> {
    const result = await this.retrieval.retrieve({ householdId: request.householdId, childProfileId: request.childProfileId, worldId: request.worldId, storySessionId: request.storySessionId, focalCharacterId: request.focalCharacterId, generationIntent: request.generationIntent, query: request.sceneFocus ?? request.generationIntent, limit: this.limit, sourceKinds: ["memory"] });
    return { items: result.candidates.map(memoryCandidateToContextItem), sourceRelevance: maxRelevance(result.candidates) };
  }
}

export class RetrievalWorldEventSource implements WorldSource {
  constructor(private readonly retrieval: ContextRetrievalSource, private readonly limit = DEFAULT_RETRIEVAL_LIMIT) {}

  async fetch(request: ContextRequest): Promise<ContextSourceResult<WorldItem>> {
    const result = await this.retrieval.retrieve({ householdId: request.householdId, childProfileId: request.childProfileId, worldId: request.worldId, storySessionId: request.storySessionId, focalCharacterId: request.focalCharacterId, generationIntent: request.generationIntent, query: request.sceneFocus ?? request.generationIntent, limit: this.limit, sourceKinds: ["world-event"] });
    const visibleChanges = result.candidates.map((candidate) => candidate.summary);
    if (visibleChanges.length === 0) return { items: [], sourceRelevance: 0 };

    const relevance = maxRelevance(result.candidates);
    const content: WorldItem = { worldFacts: [], location: request.sceneFocus ?? "current-story-location", timeOfDay: "unknown", activeHazards: [], visibleChanges, inaccessibleAreas: [] };
    return {
      items: worldToContextItems(content, { sourceEngine: "world-event-retrieval", authority: 0.95, confidence: 0.95, relevance }),
      sourceRelevance: relevance,
    };
  }
}

function memoryCandidateToContextItem(candidate: RetrievalCandidate): ContextItem<LongTermMemoryItem> {
  const content: LongTermMemoryItem = { memoryId: candidate.stableId, summary: candidate.summary, charactersInvolved: [], emotionalWeight: candidate.relevance };
  return { id: candidate.stableId, type: "long-term-memory", content, text: candidate.summary, sourceEngine: candidate.provenance.authority, authority: 0.9, confidence: 0.9, scope: "character_belief", priority: 2, relevance: candidate.relevance };
}

function maxRelevance(candidates: RetrievalCandidate[]): number {
  return candidates.reduce((maximum, candidate) => Math.max(maximum, candidate.relevance), 0);
}
