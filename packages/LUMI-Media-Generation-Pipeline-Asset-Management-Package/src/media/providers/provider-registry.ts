import type { AudioGenerationProvider } from "./audio-provider.types";
import type { ImageGenerationProvider } from "./image-provider.types";

export class MediaProviderRegistry {
  private readonly imageProviders = new Map<
    string,
    ImageGenerationProvider
  >();

  private readonly audioProviders = new Map<
    string,
    AudioGenerationProvider
  >();

  registerImageProvider(
    provider: ImageGenerationProvider,
  ) {
    this.imageProviders.set(
      provider.providerCode,
      provider,
    );
  }

  registerAudioProvider(
    provider: AudioGenerationProvider,
  ) {
    this.audioProviders.set(
      provider.providerCode,
      provider,
    );
  }

  getImageProvider(code: string) {
    const provider =
      this.imageProviders.get(code);

    if (!provider) {
      throw new Error(
        `Image provider not registered: ${code}`,
      );
    }

    return provider;
  }

  getAudioProvider(code: string) {
    const provider =
      this.audioProviders.get(code);

    if (!provider) {
      throw new Error(
        `Audio provider not registered: ${code}`,
      );
    }

    return provider;
  }
}
