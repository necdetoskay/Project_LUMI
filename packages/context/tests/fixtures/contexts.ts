import type {
  ContextRequest,
  EmotionalStateItem,
  KnowledgeItem,
  LongTermMemoryItem,
  OriginPackageItem,
  ParentPolicyItem,
  SafetyPolicyItem,
  TokenBudget,
  WorldItem,
  WorkingStoryItem,
} from "../../src/ports/context-sources.ts";

export const testRequest: ContextRequest = {
  householdId: "household-001",
  childProfileId: "child-001",
  worldId: "world-001",
  generationIntent: "continuation",
  sceneFocus: "old mill",
  focalCharacterId: "fox",
};

export const testSafetyPolicy: SafetyPolicyItem = {
  contentBoundary: "strict",
  requireParentApprovalForAi: true,
  forbiddenThemes: ["violence", "substance_abuse", "sexual_content", "profanity"],
  ageGuidance: ["Use short sentences.", "Balance tension with safety."],
  rules: [
    "No graphic physical harm.",
    "Provide a safe exit for scary moments.",
    "Do not reveal hidden truths prematurely.",
  ],
};

export const testParentPolicy: ParentPolicyItem = {
  householdId: testRequest.householdId,
  maxDailyStories: 5,
  contentBoundary: "strict",
  requireParentApprovalForAi: true,
  allowImageGeneration: false,
  allowTts: true,
  timeLimitMinutes: 30,
  forbiddenThemes: ["violence", "substance_abuse", "sexual_content", "profanity"],
};

export const testWorkingStory: WorkingStoryItem = {
  mode: "continuation",
  sceneGoal: "Investigate the mark found at the old mill.",
  worldFacts: ["The door under the mill is locked.", "Mira is not on the island."],
  activeCharacterContexts: [
    {
      characterId: "fox",
      currentState: ["Tired but careful.", "Moving slowly on wet ground."],
      activeGoal: "Find the missing map piece.",
      relevantMemories: ["Lumi rescued the fox from the river."],
      relationshipNotes: ["The fox trusts Lumi strongly."],
      beliefNotes: ["The old sailor is hiding something about the cave."],
      behaviorGuidance: ["Stay close to Lumi when in danger.", "Suggest checking the surroundings before entering the cave."],
    },
  ],
  playerKnownFacts: ["The fox found a mark at the mill.", "The old sailor does not want them near the cave."],
  hiddenFacts: ["Mira went to get help.", "The dragon is wounded and hiding."],
  pendingEvents: ["The owl left a note that has not been opened."],
  fixedDecisions: ["The fox will not enter the cave immediately."],
  mustInclude: ["The new mark must be noticed."],
  mustNotInclude: ["The dragon's true state must not be revealed."],
  tone: "gentle tension",
  ageGuidance: ["Keep sentences short."],
  choiceOptions: ["Search around the mill", "Talk to the old sailor", "Open the owl's note"],
};

export const testEmotionalState: EmotionalStateItem = {
  characterId: "fox",
  dominantEmotions: ["cautious", "hopeful"],
  behaviorGuidance: ["Pause near dark openings.", "Speak more quietly when anxious."],
  arousal: "medium",
};

export const testLongTermMemories: LongTermMemoryItem[] = [
  {
    memoryId: "mem-001",
    summary: "Lumi rescued the fox from the river.",
    charactersInvolved: ["lumi", "fox"],
    emotionalWeight: 0.9,
  },
  {
    memoryId: "mem-002",
    summary: "The fox lost the map during the river incident.",
    charactersInvolved: ["fox"],
    emotionalWeight: 0.7,
  },
  {
    memoryId: "mem-003",
    summary: "The old sailor refused to help that day.",
    charactersInvolved: ["old-sailor", "fox"],
    emotionalWeight: 0.6,
  },
];

export const testKnowledge: KnowledgeItem = {
  knownFacts: ["The fox found a mark at the mill.", "The old sailor warned them away from the cave."],
  suspectedFacts: ["Mira might be hiding something."],
  unknownFacts: ["Mira went to get help."],
  hiddenTruths: ["The dragon is wounded and hiding."],
};

export const testWorld: WorldItem = {
  worldFacts: ["The bridge is broken.", "The north cave is open."],
  location: "Old Mill surroundings",
  timeOfDay: "evening",
  weather: "light rain",
  activeHazards: ["Water level is rising near the mill."],
  visibleChanges: ["A new mark is scratched on the mill door."],
  inaccessibleAreas: ["The bridge cannot be crossed."],
};

export const testOriginPackage: OriginPackageItem = {
  originType: "first-run",
  dominantVectors: ["friendship", "mystery", "courage"],
  startingHome: "Lighthouse keeper's cottage",
  nearbyNpcSeeds: ["Owl messenger", "Old sailor"],
  firstMystery: "The locked door under the mill",
};

export const testBudget: TokenBudget = {
  totalTokens: 400,
  safetyTokens: 80,
  parentPolicyTokens: 40,
  workingStoryTokens: 120,
  emotionalStateTokens: 40,
  longTermMemoryTokens: 40,
  knowledgeTokens: 40,
  worldTokens: 40,
};

export const tightBudget: TokenBudget = {
  totalTokens: 60,
  safetyTokens: 20,
  parentPolicyTokens: 10,
  workingStoryTokens: 10,
  emotionalStateTokens: 5,
  longTermMemoryTokens: 5,
  knowledgeTokens: 5,
  worldTokens: 5,
};

export function createLooseningParentPolicy(): ParentPolicyItem {
  return {
    householdId: testRequest.householdId,
    maxDailyStories: 100,
    contentBoundary: "open",
    requireParentApprovalForAi: false,
    allowImageGeneration: true,
    allowTts: true,
    timeLimitMinutes: 30,
    forbiddenThemes: [],
  };
}

export function createMinimalRequest(): ContextRequest {
  return {
    householdId: "household-min",
    childProfileId: "child-min",
    worldId: "world-min",
    generationIntent: "new_adventure",
  };
}
