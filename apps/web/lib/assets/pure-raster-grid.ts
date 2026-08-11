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

export function splitRasterGrid(input: {
  bytesBase64: string;
  mimeType: string;
  columns: number;
  rows: number;
}) {
  const source = decode(Buffer.from(input.bytesBase64, "base64"), input.mimeType);
  const cellWidth = Math.floor(source.width / input.columns);
  const cellHeight = Math.floor(source.height / input.rows);
  if (cellWidth < 128 || cellHeight < 128) throw new Error("RASTER_GRID_TOO_SMALL");

  return Array.from({ length: input.columns * input.rows }, (_, index) => {
    const left = (index % input.columns) * cellWidth;
    const top = Math.floor(index / input.columns) * cellHeight;
    const output = new PNG({ width: cellWidth, height: cellHeight });
    for (let y = 0; y < cellHeight; y += 1) {
      const sourceStart = ((top + y) * source.width + left) * 4;
      const targetStart = y * cellWidth * 4;
      output.data.set(
        source.data.subarray(sourceStart, sourceStart + cellWidth * 4),
        targetStart,
      );
    }
    return {
      bytesBase64: PNG.sync.write(output).toString("base64"),
      mimeType: "image/png" as const,
      width: cellWidth,
      height: cellHeight,
      crop: { left, top, width: cellWidth, height: cellHeight },
    };
  });
}
