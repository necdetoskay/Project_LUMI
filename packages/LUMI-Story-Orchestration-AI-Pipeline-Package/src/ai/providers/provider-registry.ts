import type { AiTextProvider } from "./provider.types";

export class AiProviderRegistry {
  private readonly textProviders =
    new Map<string, AiTextProvider>();

  registerTextProvider(provider: AiTextProvider): void {
    this.textProviders.set(
      provider.providerCode,
      provider,
    );
  }

  getTextProvider(
    providerCode: string,
  ): AiTextProvider {
    const provider =
      this.textProviders.get(providerCode);

    if (!provider) {
      throw new Error(
        `Text provider is not registered: ${providerCode}`,
      );
    }

    return provider;
  }
}
