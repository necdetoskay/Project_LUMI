import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  SelectedInventoryItem,
  StoryParticipant,
  StoryType,
} from "@/lib/story/types";

type StoryCreationState = {
  storyType: StoryType;
  participants: StoryParticipant[];
  selectedInventoryItem?: SelectedInventoryItem;
  includeImages: boolean;
  imageCount: number;
  includeTts: boolean;
  titlePrompt: string;
  themePrompt: string;
  setStoryType: (storyType: StoryType) => void;
  setParticipants: (participants: StoryParticipant[]) => void;
  setSelectedInventoryItem: (
    item?: SelectedInventoryItem,
  ) => void;
  setIncludeImages: (enabled: boolean) => void;
  setImageCount: (count: number) => void;
  setIncludeTts: (enabled: boolean) => void;
  setTitlePrompt: (value: string) => void;
  setThemePrompt: (value: string) => void;
  reset: () => void;
};

const initialState = {
  storyType: "interactive" as StoryType,
  participants: [],
  selectedInventoryItem: undefined,
  includeImages: true,
  imageCount: 4,
  includeTts: false,
  titlePrompt: "",
  themePrompt: "",
};

export const useStoryCreationStore =
  create<StoryCreationState>()(
    persist(
      (set) => ({
        ...initialState,
        setStoryType: (storyType) => set({ storyType }),
        setParticipants: (participants) =>
          set({ participants }),
        setSelectedInventoryItem: (selectedInventoryItem) =>
          set({ selectedInventoryItem }),
        setIncludeImages: (includeImages) =>
          set({ includeImages }),
        setImageCount: (imageCount) => set({ imageCount }),
        setIncludeTts: (includeTts) =>
          set({ includeTts }),
        setTitlePrompt: (titlePrompt) =>
          set({ titlePrompt }),
        setThemePrompt: (themePrompt) =>
          set({ themePrompt }),
        reset: () => set(initialState),
      }),
      {
        name: "lumi-story-creation",
      },
    ),
  );
