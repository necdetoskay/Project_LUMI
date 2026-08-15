import {
  type ContextItem,
  type ContextRequest,
  type ContextSourceResult,
  type WorldItem,
  type WorldSource,
} from "../ports";

function worldToSemanticItems(world: WorldItem): ContextItem<WorldItem>[] {
  const base = {
    content: world,
    sourceEngine: "world",
    authority: 0.95,
    confidence: 1,
    scope: "world_truth" as const,
  };

  const items: ContextItem<WorldItem>[] = [
    {
      ...base,
      id: "world:location",
      type: "world-location",
      text: `Location: ${world.location}`,
      priority: 0,
      relevance: 1,
    },
  ];

  if (world.activeHazards.length > 0) {
    items.push({
      ...base,
      id: "world:hazards",
      type: "world-hazards",
      text: `Active hazards: ${world.activeHazards.join("; ")}`,
      priority: 1,
      relevance: 0.95,
    });
  }

  if (world.visibleChanges.length > 0) {
    items.push({
      ...base,
      id: "world:visible-changes",
      type: "world-visible-changes",
      text: `Visible changes: ${world.visibleChanges.join("; ")}`,
      priority: 1,
      relevance: 0.9,
    });
  }

  if (world.worldFacts.length > 0) {
    items.push({
      ...base,
      id: "world:facts",
      type: "world-facts",
      text: `World facts: ${world.worldFacts.join("; ")}`,
      priority: 2,
      relevance: 0.9,
    });
  }

  items.push({
    ...base,
    id: "world:environment",
    type: "world-environment",
    text: [
      `Time of day: ${world.timeOfDay}`,
      `Weather: ${world.weather ?? "unknown"}`,
    ].join("\n"),
    priority: 3,
    relevance: 0.75,
  });

  if (world.inaccessibleAreas.length > 0) {
    items.push({
      ...base,
      id: "world:inaccessible",
      type: "world-inaccessible",
      text: `Inaccessible areas: ${world.inaccessibleAreas.join("; ")}`,
      priority: 3,
      relevance: 0.7,
    });
  }

  return items;
}

export class InMemoryWorldAdapter implements WorldSource {
  constructor(private readonly world: WorldItem) {}

  async fetch(
    _request: ContextRequest,
  ): Promise<ContextSourceResult<WorldItem>> {
    void _request;
    return {
      sourceRelevance: 0.9,
      items: worldToSemanticItems(this.world),
    };
  }
}
