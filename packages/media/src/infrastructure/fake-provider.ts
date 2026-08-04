import type {
  ProviderAudioRequest,
  ProviderAudioResult,
  ProviderImageRequest,
  ProviderImageResult,
  ProviderTtsRequest,
} from "../ports/provider.port";
import type { MediaProvider } from "../ports/provider.port";

export interface FakeProviderImage extends ProviderImageResult {
  requestedPrompt: string;
  requestedIdentity?: string | undefined;
}

export interface FakeProviderAudio extends ProviderAudioResult {
  requestedText?: string | undefined;
  requestedTags?: string[] | undefined;
}

export class FakeMediaProvider implements MediaProvider {
  readonly providerId = "fake";
  readonly supportsModels = ["fake-image", "fake-tts", "fake-ambient"];

  failNextImageWith: string | undefined;
  failNextAudioWith: string | undefined;

  private readonly imageCalls: FakeProviderImage[] = [];
  private readonly audioCalls: FakeProviderAudio[] = [];

  constructor(
    private readonly options: {
      imageBytes?: Uint8Array;
      audioBytes?: Uint8Array;
      latencyMs?: number;
    } = {},
  ) {}

  get imageCallsSnapshot(): FakeProviderImage[] {
    return [...this.imageCalls];
  }

  get audioCallsSnapshot(): FakeProviderAudio[] {
    return [...this.audioCalls];
  }

  async generateImage(
    request: ProviderImageRequest,
  ): Promise<ProviderImageResult> {
    if (this.failNextImageWith) {
      const reason = this.failNextImageWith;
      this.failNextImageWith = undefined;
      throw new Error(reason);
    }
    await delay(this.options.latencyMs ?? 1);
    const bytes =
      this.options.imageBytes ??
      deterministicImageBytes(request);
    const result: FakeProviderImage = {
      bytes,
      mimeType: "image/png",
      width: request.width,
      height: request.height,
      requestedPrompt: request.prompt,
      requestedIdentity: request.identity?.referenceKey,
    };
    this.imageCalls.push(result);
    return result;
  }

  async synthesizeSpeech(
    request: ProviderTtsRequest,
  ): Promise<ProviderAudioResult> {
    if (this.failNextAudioWith) {
      const reason = this.failNextAudioWith;
      this.failNextAudioWith = undefined;
      throw new Error(reason);
    }
    await delay(this.options.latencyMs ?? 1);
    const bytes =
      this.options.audioBytes ?? deterministicBytes("tts", request.requestId);
    const result: FakeProviderAudio = {
      bytes,
      mimeType: "audio/mpeg",
      durationSeconds: Math.min(
        request.maxSeconds,
        Math.max(1, Math.round(request.text.length / 16)),
      ),
      requestedText: request.text,
    };
    this.audioCalls.push(result);
    return result;
  }

  async generateAmbient(
    request: ProviderAudioRequest,
  ): Promise<ProviderAudioResult> {
    if (this.failNextAudioWith) {
      const reason = this.failNextAudioWith;
      this.failNextAudioWith = undefined;
      throw new Error(reason);
    }
    await delay(this.options.latencyMs ?? 1);
    const bytes =
      this.options.audioBytes ?? deterministicBytes("ambient", request.requestId);
    const result: FakeProviderAudio = {
      bytes,
      mimeType: "audio/ogg",
      durationSeconds: Math.min(request.maxSeconds, 5),
      requestedTags: [...request.tags],
    };
    this.audioCalls.push(result);
    return result;
  }
}

function deterministicImageBytes(request: ProviderImageRequest): Uint8Array {
  const encoder = new TextEncoder();
  const identityParts = request.identity
    ? [
        request.identity.referenceKey,
        ...request.identity.traitHashes,
      ]
    : [];
  return encoder.encode(
    ["image", request.requestId, ...identityParts].join(":"),
  );
}

function deterministicBytes(prefix: string, requestId: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`${prefix}:${requestId}`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
