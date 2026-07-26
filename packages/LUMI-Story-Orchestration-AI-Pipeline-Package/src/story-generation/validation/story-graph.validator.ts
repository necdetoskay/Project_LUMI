import type { GeneratedStory } from "../schemas/generated-story.schema";

export type StoryGraphValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateStoryGraph(
  story: GeneratedStory,
): StoryGraphValidationResult {
  const errors: string[] = [];
  const nodeMap = new Map(
    story.nodes.map((node) => [node.key, node]),
  );

  if (!nodeMap.has(story.startNodeKey)) {
    errors.push(
      "startNodeKey does not reference an existing node",
    );
  }

  const endingCount = story.nodes.filter(
    (node) => node.nodeType === "ending",
  ).length;

  if (endingCount === 0) {
    errors.push("Story must contain at least one ending node");
  }

  for (const node of story.nodes) {
    if (
      node.nodeType === "choice" &&
      node.choices.length < 2
    ) {
      errors.push(
        `Choice node ${node.key} must contain at least two choices`,
      );
    }

    if (
      node.nodeType !== "choice" &&
      node.choices.length > 0
    ) {
      errors.push(
        `Non-choice node ${node.key} cannot contain choices`,
      );
    }

    for (const choice of node.choices) {
      if (!nodeMap.has(choice.nextNodeKey)) {
        errors.push(
          `Choice ${choice.key} references missing node ${choice.nextNodeKey}`,
        );
      }
    }
  }

  const visited = new Set<string>();
  const stack = [story.startNodeKey];

  while (stack.length > 0) {
    const currentKey = stack.pop();
    if (!currentKey || visited.has(currentKey)) continue;

    visited.add(currentKey);
    const node = nodeMap.get(currentKey);

    for (const choice of node?.choices ?? []) {
      stack.push(choice.nextNodeKey);
    }
  }

  for (const node of story.nodes) {
    if (!visited.has(node.key)) {
      errors.push(
        `Node ${node.key} is unreachable from start node`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
