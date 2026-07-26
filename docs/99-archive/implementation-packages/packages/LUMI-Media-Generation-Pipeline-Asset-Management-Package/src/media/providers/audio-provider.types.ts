import type { GeneratedAsset } from "../types";

export type AudioGenerationInput = {
  model: string;
  text: string;
  voiceCode: string;
  speakingRate?: number;
  emotionStyle?: string;
  format: "mp3" | "wav" | "ogg";
};

export interface AudioGenerationProvider {
  readonly providerCode: string;

  generateAudio(
    input: AudioGenerationInput,
  ): Promise<GeneratedAsset>;
}
