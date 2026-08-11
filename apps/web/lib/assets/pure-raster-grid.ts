import jpeg from "jpeg-js";
import { PNG } from "pngjs";

type Raster = { width: number; height: number; data: Uint8Array };

function decode(bytes: Buffer, mimeType: string): Raster {
  if (mimeType === "image/png") {
    const image = PNG.sync.read(bytes);
    return { width: image.width, height: image.height, data: image.data };
  }
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    const image = jpeg.decode(bytes, { useTArray: true });
    return { width: image.width, height: image.height, data: image.data };
  }
  throw new Error(`RASTER_FORMAT_UNSUPPORTED:${mimeType}`);
}

function cropRaster(
  source: Raster,
  crop: { left: number; top: number; width: number; height: number },
) {
  if (crop.width < 128 || crop.height < 128)
    throw new Error("RASTER_GRID_TOO_SMALL");
  const output = new PNG({ width: crop.width, height: crop.height });
  for (let y = 0; y < crop.height; y += 1) {
    const sourceStart = ((crop.top + y) * source.width + crop.left) * 4;
    const targetStart = y * crop.width * 4;
    output.data.set(
      source.data.subarray(sourceStart, sourceStart + crop.width * 4),
      targetStart,
    );
  }
  return {
    bytesBase64: PNG.sync.write(output).toString("base64"),
    mimeType: "image/png" as const,
    width: crop.width,
    height: crop.height,
    crop,
  };
}

export function splitRasterRegions(input: {
  bytesBase64: string;
  mimeType: string;
  regions: Array<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>;
}) {
  const source = decode(
    Buffer.from(input.bytesBase64, "base64"),
    input.mimeType,
  );
  return input.regions.map((region) => {
    const crop = {
      left: Math.floor(region.left * source.width),
      top: Math.floor(region.top * source.height),
      width: Math.floor(region.width * source.width),
      height: Math.floor(region.height * source.height),
    };
    if (
      crop.left < 0 ||
      crop.top < 0 ||
      crop.left + crop.width > source.width ||
      crop.top + crop.height > source.height
    )
      throw new Error("RASTER_REGION_OUT_OF_BOUNDS");
    return cropRaster(source, crop);
  });
}

export function splitRasterGrid(input: {
  bytesBase64: string;
  mimeType: string;
  columns: number;
  rows: number;
}) {
  const source = decode(
    Buffer.from(input.bytesBase64, "base64"),
    input.mimeType,
  );
  const cellWidth = Math.floor(source.width / input.columns);
  const cellHeight = Math.floor(source.height / input.rows);
  if (cellWidth < 128 || cellHeight < 128)
    throw new Error("RASTER_GRID_TOO_SMALL");

  return Array.from({ length: input.columns * input.rows }, (_, index) => {
    const left = (index % input.columns) * cellWidth;
    const top = Math.floor(index / input.columns) * cellHeight;
    return cropRaster(source, {
      left,
      top,
      width: cellWidth,
      height: cellHeight,
    });
  });
}
