export interface ChildExportPayload {
  exportFormat: string;
  exportedAt: string;
  childProfile: {
    id: string;
    displayName: string;
    ageBand: string;
    locale: string;
    createdAt: string;
  };
  preferences: {
    storyLength: string;
    interactionLevel: number;
    imageEnabled: boolean;
    audioEnabled: boolean;
  } | null;
  characters: Array<{
    id: string;
    name: string;
    broadKind: string;
    characterType: string;
    originMode: string | null;
    originConcept: string | null;
    createdAt: string;
  }>;
  storySessions: Array<{
    id: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
  }>;
}
