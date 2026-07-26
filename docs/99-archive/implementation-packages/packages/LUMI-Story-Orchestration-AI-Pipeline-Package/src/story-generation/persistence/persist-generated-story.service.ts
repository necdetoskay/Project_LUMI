import type { QueryExecutor } from "../../db/transaction";
import {
  questions,
  stories,
  storyChoices,
  storyNodes,
  storyVersions,
} from "../../db/schema";
import type { GeneratedStory } from "../schemas/generated-story.schema";

export async function persistGeneratedStory(
  tx: QueryExecutor,
  input: {
    worldId: string;
    childProfileId: string;
    generationRequestId: string;
    storyType: "static" | "interactive";
    story: GeneratedStory;
  },
) {
  const [story] = await tx
    .insert(stories)
    .values({
      worldId: input.worldId,
      childProfileId: input.childProfileId,
      title: input.story.title,
      storyType: input.storyType,
      status: "ready",
    })
    .returning();

  if (!story) {
    throw new Error("Story persistence returned no story");
  }

  const [version] = await tx
    .insert(storyVersions)
    .values({
      storyId: story.id,
      versionNumber: 1,
      generationRequestId:
        input.generationRequestId,
      title: input.story.title,
      summary: input.story.summary,
      ageBand: input.story.ageBand,
      themes: input.story.themes,
      metadata: input.story.metadata,
      isPublished: true,
    })
    .returning();

  if (!version) {
    throw new Error(
      "Story persistence returned no version",
    );
  }

  const nodeIds = new Map<string, string>();

  for (const node of input.story.nodes) {
    const [created] = await tx
      .insert(storyNodes)
      .values({
        storyVersionId: version.id,
        nodeKey: node.key,
        nodeType: node.nodeType,
        title: node.title,
        body: node.body,
        ambience: node.ambience,
        imagePrompt: node.imagePrompt,
        isStartNode:
          node.key === input.story.startNodeKey,
      })
      .returning();

    if (!created) {
      throw new Error(
        `Story node persistence failed: ${node.key}`,
      );
    }

    nodeIds.set(node.key, created.id);
  }

  for (const node of input.story.nodes) {
    const sourceNodeId = nodeIds.get(node.key);

    for (
      let index = 0;
      index < node.choices.length;
      index += 1
    ) {
      const choice = node.choices[index];
      const nextNodeId = nodeIds.get(
        choice.nextNodeKey,
      );

      if (!sourceNodeId || !nextNodeId) {
        throw new Error(
          `Choice persistence references missing node: ${choice.key}`,
        );
      }

      await tx.insert(storyChoices).values({
        storyNodeId: sourceNodeId,
        choiceKey: choice.key,
        label: choice.label,
        hint: choice.hint,
        consequencePreview:
          choice.consequencePreview,
        nextStoryNodeId: nextNodeId,
        displayOrder: index,
        effects: choice.effects,
      });
    }
  }

  for (const question of input.story.questions) {
    await tx.insert(questions).values({
      storyVersionId: version.id,
      questionType: question.questionType,
      prompt: question.prompt,
      ageBand: question.ageBand,
      expectedSignals:
        question.expectedSignals,
    });
  }

  return {
    storyId: story.id,
    storyVersionId: version.id,
  };
}
