export type ThumbnailInput = {
  sourceBytes: Uint8Array;
  sourceMimeType: string;
  maxWidth: number;
  maxHeight: number;
};

export type ThumbnailOutput = {
  bytes: Uint8Array;
  mimeType: string;
  width: number;
  height: number;
};

export interface ThumbnailGenerator {
  generate(
    input: ThumbnailInput,
  ): Promise<ThumbnailOutput>;
}
