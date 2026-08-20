import type {
  GenesisOriginHook,
  GenesisOriginQuestion,
  GenesisOriginState,
} from "./character-genesis";

/**
 * Canonical origin shape produced by Deep Origin generation.
 * It remains assignable to GenesisOriginState so existing Character Genesis
 * package consumers stay backward-compatible while fact-lineage metadata is
 * available to newer stages.
 */
export interface GenesisDeepOriginState extends GenesisOriginState {
  summaryFactIds: string[];
  narrativeFactIds: string[];
  unresolvedQuestions: GenesisOriginQuestion[];
  storyHooks: GenesisOriginHook[];
}
