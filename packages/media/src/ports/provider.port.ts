import type { CharacterVisualIdentity, VoiceProfile } from "../domain/identity";

export interface ProviderImageRequest {
  requestId: string;
  prompt: string;
  identity?: CharacterVisualIdentity | undefined;
  width: number;
  height: number;
  quality: "standard" | "high";
  timeoutMs: number;
  seed?: string | undefined;
}

export interface ProviderImageResult {
  bytes: Uint8Array;
  mimeType: string;
  width: number;
  height: number;
}

export interface ProviderTtsRequest {
  requestId: string;
  text: string;
  voice: VoiceProfile;
  maxSeconds: number;
  timeoutMs: number;
  seed?: string | undefined;
}

export interface ProviderAudioRequest {
  requestId: string;
  tags: string[];
  maxSeconds: number;
  timeoutMs: number;
  seed?: string | undefined;
}

export interface ProviderAudioResult {
  bytes: Uint8Array;
  mimeType: string;
  durationSeconds: number;
}

export interface MediaProvider {
  readonly providerId: string;
  readonly supportsModels: readonly string[];
  generateImage(request: ProviderImageRequest): Promise<ProviderImageResult>;
  synthesizeSpeech(request: ProviderTtsRequest): Promise<ProviderAudioResult>;
  generateAmbient(request: ProviderAudioRequest): Promise<ProviderAudioResult>;
}
