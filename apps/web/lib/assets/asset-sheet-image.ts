import jpeg from "jpeg-js";
import { PNG } from "pngjs";

import type { GenerationAssetSheetPlan } from "@lumi/media/application";

type DecodedImage = {
  width: number;
  height: number;
  data: Uint8Array;
};

export type SplitAssetSheetTile = {
  cellIndex: number;
  bytesBase64: string;
  mimeType: "image/png" | "image/jpeg";
  width: number;
  height: number;
};

function decodeImage(bytesBase64: string, mimeType: string): DecodedImage {
  const bytes = Buffer.from(bytesBase64, "base64");
  if (mimeType === "image/png") {
    const image = PNG.sync.read(bytes);
    return { width: image.width, height: image.height, data: image.data };
  }
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    const image = jpeg.decode(bytes, { useTArray: true });
    return { width: image.width, height: image.height, data: image.data };
  }
  throw new Error(`STORY_VISUAL_SHEET_UNSUPPORTED_MIME:${mimeType}`);
}

function cropRgba(
  source: DecodedImage,
  left: number,
  top: number,
  width: number,
  height: number,
): DecodedImage {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceOffset = ((top + y) * source.width + (left + x)) * 4;
      const targetOffset = (y * width + x) * 4;
      data[targetOffset] = source.data[sourceOffset] ?? 0;
      data[targetOffset + 1] = source.data[sourceOffset + 1] ?? 0;
      data[targetOffset + 2] = source.data[sourceOffset + 2] ?? 0;
      data[targetOffset + 3] = source.data[sourceOffset + 3] ?? 255;
    }
  }
  return { width, height, data };
}

function resizeNearest(source: DecodedImage, maxPx: number): DecodedImage {
  const scale = Math.min(1, maxPx / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  if (width === source.width && height === source.height) return source;

  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(
      source.height - 1,
      Math.floor((y * source.height) / height),
    );
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(
        source.width - 1,
        Math.floor((x * source.width) / width),
      );
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      const targetOffset = (y * width + x) * 4;
      data[targetOffset] = source.data[sourceOffset] ?? 0;
      data[targetOffset + 1] = source.data[sourceOffset + 1] ?? 0;
      data[targetOffset + 2] = source.data[sourceOffset + 2] ?? 0;
      data[targetOffset + 3] = source.data[sourceOffset + 3] ?? 255;
    }
  }
  return { width, height, data };
}

function encodeImage(
  image: DecodedImage,
  mimeType: "image/png" | "image/jpeg",
) {
  if (mimeType === "image/png") {
    const png = new PNG({ width: image.width, height: image.height });
    png.data = Buffer.from(image.data);
    return PNG.sync.write(png);
  }
  return Buffer.from(
    jpeg.encode(
      {
        width: image.width,
        height: image.height,
        data: Buffer.from(image.data),
      },
      90,
    ).data,
  );
}

export function splitAssetSheetImage(input: {
  plan: GenerationAssetSheetPlan;
  bytesBase64: string;
  mimeType: string;
}): SplitAssetSheetTile[] {
  const source = decodeImage(input.bytesBase64, input.mimeType);
  const mimeType = input.mimeType === "image/png" ? "image/png" : "image/jpeg";
  const cellWidth = Math.floor(source.width / input.plan.columns);
  const cellHeight = Math.floor(source.height / input.plan.rows);
  if (cellWidth < 1 || cellHeight < 1) {
    throw new Error("STORY_VISUAL_SHEET_DIMENSIONS_INVALID");
  }

  return input.plan.cells.map((cell) => {
    const left = cell.column * cellWidth;
    const top = cell.row * cellHeight;
    const cropped = cropRgba(source, left, top, cellWidth, cellHeight);
    const resized = resizeNearest(cropped, input.plan.outputMaxPx);
    const encoded = encodeImage(resized, mimeType);
    return {
      cellIndex: cell.cellIndex,
      bytesBase64: encoded.toString("base64"),
      mimeType,
      width: resized.width,
      height: resized.height,
    };
  });
}
