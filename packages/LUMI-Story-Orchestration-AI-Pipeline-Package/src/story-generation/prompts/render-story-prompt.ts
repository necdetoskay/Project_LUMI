import type { StoryContext } from "../context/story-context.types";

export function renderStoryPrompt(input: {
  context: StoryContext;
  storyType: "static" | "interactive";
  titlePrompt?: string;
  themePrompt?: string;
}): string {
  return JSON.stringify(
    {
      task: "Generate a child-safe LUMI story",
      constraints: {
        storyType: input.storyType,
        nonCombat: true,
        ageBand:
          input.context.child.ageBand ?? "unknown",
        preserveWorldContinuity: true,
        useRelevantMemoriesOnly: true,
        useSelectedItemMeaningfully:
          Boolean(input.context.selectedItem),
        interactiveChoiceCount:
          input.storyType === "interactive"
            ? { min: 2, max: 4 }
            : { min: 0, max: 0 },
      },
      request: {
        titlePrompt: input.titlePrompt,
        themePrompt: input.themePrompt,
      },
      context: input.context,
    },
    null,
    2,
  );
}
