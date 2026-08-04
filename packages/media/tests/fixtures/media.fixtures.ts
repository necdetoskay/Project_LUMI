import type { AssetScope } from "../../src/domain/asset";
import type {
  AudioDurationPolicy,
  ImageSizePolicy,
  MediaModelPolicy,
} from "../../src/domain/media-types";
import type {
  CharacterVisualIdentity,
  VoiceProfile,
} from "../../src/domain/identity";

export const SCOPE: AssetScope = {
  householdId: "11111111-1111-4111-8111-111111111111",
  childProfileId: "22222222-2222-4222-8222-222222222222",
  worldId: "33333333-3333-4333-8333-333333333333",
};

export const IMAGE_POLICY: ImageSizePolicy = {
  label: "medium",
  width: 1024,
  height: 1024,
  quality: "standard",
  maxBytes: 5 * 1024 * 1024,
};

export const IMAGE_POLICY_LARGE: ImageSizePolicy = {
  label: "large",
  width: 2048,
  height: 2048,
  quality: "high",
  maxBytes: 20 * 1024 * 1024,
};

export const AUDIO_POLICY: AudioDurationPolicy = {
  maxSeconds: 60,
  bitrateKbps: 128,
  maxBytes: 2 * 1024 * 1024,
};

export const IMAGE_MODEL: MediaModelPolicy = {
  providerId: "fake",
  modelId: "fake-image",
  maxAttempts: 3,
  timeoutMs: 30_000,
};

export const AUDIO_MODEL: MediaModelPolicy = {
  providerId: "fake",
  modelId: "fake-tts",
  maxAttempts: 3,
  timeoutMs: 30_000,
};

export const IDENTITY: CharacterVisualIdentity = {
  characterId: "char-1",
  referenceKey: "ref-key-1",
  traitHashes: ["trait-a", "trait-b"],
};

export const VOICE: VoiceProfile = {
  voiceId: "voice-1",
  providerKey: "fake-voice-1",
};
