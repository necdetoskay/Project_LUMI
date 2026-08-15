import type { ContextItem, WorldItem } from "../ports";

export interface WorldContextMapperOptions {
  sourceEngine?: string;
  authority?: number;
  confidence?: number;
  relevance?: number;
}

export function worldToContextItems(
  world: WorldItem,
  options: WorldContextMapperOptions = {},
): ContextItem<WorldItem>[] {
  const {
    sourceEngine = "world",
    authority = 0.95,
    confidence = 1,
    relevance = 0.9,
  } = options;
  const base = {
    content: world,
    sourceEngine,
    authority,
    confidence,
    scope: "world_truth" as const,
  };
  const items: ContextItem<WorldItem>[] = [
    {
      ...base,
      id: "world:location",
      type: "world-location",
      text: `Location: ${world.location}`,
      priority: 0,
      relevance: Math.max(relevance, 0.95),
    },
  ];

  if (world.activeHazards.length > 0) {
    items.push({
      ...base,
      id: "world:hazards",
      type: "world-hazards",
      text: `Active hazards: ${world.activeHazards.join("; ")}`,
      priority: 1,
      relevance: Math.max(relevance, 0.9),
    });
  }
  if (world.visibleChanges.length > 0) {
    items.push({
      ...base,
      id: "world:visible-changes",
      type: "world-visible-changes",
      text: `Visible changes: ${world.visibleChanges.join("; ")}`,
      priority: 1,
      relevance: Math.max(relevance, 0.85),
    });
  }
  if (world.worldFacts.length > 0) {
    items.push({
      ...base,
      id: "world:facts",
      type: "world-facts",
      text: `World facts: ${world.worldFacts.join("; ")}`,
      priority: 2,
      relevance,
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
    relevance: Math.min(relevance, 0.8),
  });
  if (world.inaccessibleAreas.length > 0) {
    items.push({
      ...base,
      id: "world:inaccessible",
      type: "world-inaccessible",
      text: `Inaccessible areas: ${world.inaccessibleAreas.join("; ")}`,
      priority: 3,
      relevance: Math.min(relevance, 0.75),
    });
  }
  return items;
}
