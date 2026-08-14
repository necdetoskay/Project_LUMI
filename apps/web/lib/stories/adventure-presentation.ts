export type AdventureSemanticState = "ongoing" | "completed" | "archived";

export type AdventureSourceFamily =
  | "world_event"
  | "rumor"
  | "inventory_item"
  | "npc_call";

export type AdventurePresentationImage = {
  kind: "story_scene" | "environment" | "item" | "npc" | "character";
  subjectId: string;
};

export type AdventureHighlight = {
  kind: "location" | "item" | "companion" | "clue";
  label: string;
  subjectId?: string;
};

export type AdventureSummary = {
  sessionId: string;
  title: string;
  semanticState: AdventureSemanticState;
  playerRecap: string;
  currentSceneTitle: string | null;
  highlights: AdventureHighlight[];
  image: AdventurePresentationImage | null;
};

export type AdventureHookCandidate = {
  id: string;
  sourceFamily: AdventureSourceFamily;
  title: string;
  teaser: string;
  ctaKey:
    | "chooseWorldEvent"
    | "investigateRumor"
    | "followItem"
    | "answerNpcCall";
  image: AdventurePresentationImage | null;
};

export type AdventureStartIntent = {
  householdId: string;
  childProfileId: string;
  characterId: string;
  worldId: string;
  storyDefinitionId: string;
  storyVersionId: string;
  candidateId?: string;
  idempotencyKey: string;
};

export type AdventureStartResult = {
  sessionId: string;
  attachedCandidateId: string | null;
};

export type AdventureSessionProjectionInput = {
  session: {
    id: string;
    sessionStatus: string;
  };
  definition?: {
    title?: string | null;
  } | null;
  version?: {
    title?: string | null;
    summary?: string | null;
  } | null;
  currentScene?: {
    id?: string | null;
    title?: string | null;
    narrativeText?: string | null;
  } | null;
  location?: {
    id?: string | null;
    displayName: string;
  } | null;
  meaningfulItem?: {
    id: string;
    displayName: string;
  } | null;
  companion?: {
    id: string;
    displayName: string;
  } | null;
  image?: AdventurePresentationImage | null;
};

export type OpportunityCandidateInput = {
  id: string;
  type: string;
  message: string;
  sourceNpcId?: string | null;
  evidence?: Record<string, unknown>;
};

export type InventoryCandidateInput = {
  itemInstanceId: string;
  displayName: string;
};

const MAX_RECAP_LENGTH = 360;

function cleanNarrative(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function clipNarrative(value: string): string {
  if (value.length <= MAX_RECAP_LENGTH) return value;

  const clipped = value.slice(0, MAX_RECAP_LENGTH - 1).trimEnd();
  const sentenceBoundary = Math.max(
    clipped.lastIndexOf("."),
    clipped.lastIndexOf("!"),
    clipped.lastIndexOf("?"),
  );

  if (sentenceBoundary >= Math.floor(MAX_RECAP_LENGTH * 0.55)) {
    return clipped.slice(0, sentenceBoundary + 1);
  }

  return `${clipped}…`;
}

export function semanticAdventureState(
  sessionStatus: string,
): AdventureSemanticState {
  if (sessionStatus === "completed") return "completed";
  if (sessionStatus === "abandoned") return "archived";
  return "ongoing";
}

export function buildPlayerRecap(
  input: AdventureSessionProjectionInput,
): string {
  const narrative = cleanNarrative(input.currentScene?.narrativeText);
  if (narrative) return clipNarrative(narrative);

  const versionSummary = cleanNarrative(input.version?.summary);
  if (versionSummary) return clipNarrative(versionSummary);

  const sceneTitle = cleanNarrative(input.currentScene?.title);
  if (sceneTitle) return sceneTitle;

  return (
    cleanNarrative(input.definition?.title ?? input.version?.title) || "Story"
  );
}

export function projectAdventureSummary(
  input: AdventureSessionProjectionInput,
): AdventureSummary {
  const title =
    cleanNarrative(input.definition?.title) ||
    cleanNarrative(input.version?.title) ||
    cleanNarrative(input.currentScene?.title) ||
    "Story";

  const highlights: AdventureHighlight[] = [];
  if (input.location?.displayName) {
    highlights.push({
      kind: "location",
      label: input.location.displayName,
      ...(input.location.id ? { subjectId: input.location.id } : {}),
    });
  }
  if (input.meaningfulItem?.displayName) {
    highlights.push({
      kind: "item",
      label: input.meaningfulItem.displayName,
      subjectId: input.meaningfulItem.id,
    });
  }
  if (input.companion?.displayName) {
    highlights.push({
      kind: "companion",
      label: input.companion.displayName,
      subjectId: input.companion.id,
    });
  }

  return {
    sessionId: input.session.id,
    title,
    semanticState: semanticAdventureState(input.session.sessionStatus),
    playerRecap: buildPlayerRecap(input),
    currentSceneTitle: input.currentScene?.title ?? null,
    highlights: highlights.slice(0, 2),
    image: input.image ?? null,
  };
}

function sourceFamilyForOpportunity(type: string): AdventureSourceFamily {
  if (type === "rumor") return "rumor";
  if (type === "invitation" || type === "social_visit" || type === "gift") {
    return "npc_call";
  }
  return "world_event";
}

function ctaForFamily(
  sourceFamily: AdventureSourceFamily,
): AdventureHookCandidate["ctaKey"] {
  if (sourceFamily === "rumor") return "investigateRumor";
  if (sourceFamily === "inventory_item") return "followItem";
  if (sourceFamily === "npc_call") return "answerNpcCall";
  return "chooseWorldEvent";
}

function evidenceString(
  evidence: Record<string, unknown> | undefined,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = evidence?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function projectOpportunityCandidate(
  opportunity: OpportunityCandidateInput,
): AdventureHookCandidate {
  const sourceFamily = sourceFamilyForOpportunity(opportunity.type);
  const evidenceTitle = evidenceString(
    opportunity.evidence,
    "title",
    "claim",
    "placeClaim",
  );

  return {
    id: `opportunity:${opportunity.id}`,
    sourceFamily,
    title: evidenceTitle ?? cleanNarrative(opportunity.message),
    teaser: cleanNarrative(opportunity.message),
    ctaKey: ctaForFamily(sourceFamily),
    image:
      sourceFamily === "npc_call" && opportunity.sourceNpcId
        ? { kind: "npc", subjectId: opportunity.sourceNpcId }
        : null,
  };
}

export function projectInventoryCandidate(
  item: InventoryCandidateInput,
  teaser: string,
): AdventureHookCandidate {
  return {
    id: `inventory:${item.itemInstanceId}`,
    sourceFamily: "inventory_item",
    title: item.displayName,
    teaser: cleanNarrative(teaser),
    ctaKey: "followItem",
    image: { kind: "item", subjectId: item.itemInstanceId },
  };
}

export function containsTechnicalPresentationLeak(value: unknown): boolean {
  const serialized = JSON.stringify(value).toLowerCase();
  const leakPatterns = [
    /\bcheckpoint\b/,
    /\bplaybackmode\b/,
    /\bsessionstatus\b/,
    /\blifecyclestatus\b/,
    /\brecommendationscore\b/,
    /\brarity\b/,
    /\bworld [0-9a-f]{6,}\b/,
  ];

  return leakPatterns.some((pattern) => pattern.test(serialized));
}
