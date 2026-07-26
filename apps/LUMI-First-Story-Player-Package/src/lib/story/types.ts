export type StoryType = "static" | "interactive";

export type StoryParticipant = {
  characterId: string;
  name: string;
  role: "primary" | "companion";
};

export type SelectedInventoryItem = {
  itemInstanceId: string;
  name: string;
  iconUrl?: string;
};

export type StoryChoice = {
  id: string;
  label: string;
  hint?: string;
  consequencePreview?: string;
  nextNodeId?: string;
};

export type StoryNode = {
  id: string;
  nodeType: "narrative" | "choice" | "ending";
  title?: string;
  body: string;
  ambience?: string[];
  imageAssetUrl?: string;
  choices?: StoryChoice[];
};

export type StoryPlayerSession = {
  sessionId: string;
  storyId: string;
  storyVersionId: string;
  currentNodeId: string;
  participants: StoryParticipant[];
  selectedInventoryItem?: SelectedInventoryItem;
};
