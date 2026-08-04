export interface CharacterVisualIdentity {
  characterId: string;
  referenceKey: string;
  traitHashes: string[];
  providerKey?: string | undefined;
}

export interface VoiceProfile {
  voiceId: string;
  providerKey: string;
  pitch?: number | undefined;
  pace?: number | undefined;
}
