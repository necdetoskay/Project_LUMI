import jpeg from "jpeg-js";
import { PNG } from "pngjs";

export type ItemStatePanel = {
  stateId: string;
  bytesBase64: string;
  mimeType: "image/png";
  width: number;
  height: number;
};

type Raster = {
  width: number;
  height: number;
  data: Uint8Array;
};

function decodeRaster(bytesBase64: string, mimeType: string): Raster {
  const bytes = Buffer.from(bytesBase64, "base64");
  if (mimeType === "image/png") {
    const decoded = PNG.sync.read(bytes);
    return { width: decoded.width, height: decoded.height, data: decoded.data };
  }
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
    return { width: decoded.width, height: decoded.height, data: decoded.data };
  }
  throw new Error("ITEM_STATE_GRID_MIME_UNSUPPORTED");
}

function layout(panelCount: number) {
  if (panelCount === 1) return { columns: 1, rows: 1 };
  if (panelCount === 2) return { columns: 2, rows: 1 };
  if (panelCount === 3 || panelCount === 4) return { columns: 2, rows: 2 };
  throw new Error("ITEM_STATE_GRID_PANEL_COUNT_INVALID");
}

function cropSquare(
  raster: Raster,
  left: number,
  top: number,
  cellWidth: number,
  cellHeight: number,
): Raster {
  const size = Math.min(cellWidth, cellHeight);
  const x0 = left + Math.floor((cellWidth - size) / 2);
  const y0 = top + Math.floor((cellHeight - size) / 2);
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const source = ((y0 + y) * raster.width + x0 + x) * 4;
      const target = (y * size + x) * 4;
      data[target] = raster.data[source] ?? 0;
      data[target + 1] = raster.data[source + 1] ?? 0;
      data[target + 2] = raster.data[source + 2] ?? 0;
      data[target + 3] = raster.data[source + 3] ?? 255;
    }
  }
  return { width: size, height: size, data };
}

function resizeSquare(raster: Raster, maxSize: number): Raster {
  if (raster.width <= maxSize) return raster;
  const size = maxSize;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    const sourceY = Math.min(
      raster.height - 1,
      Math.floor(((y + 0.5) * raster.height) / size),
    );
    for (let x = 0; x < size; x += 1) {
      const sourceX = Math.min(
        raster.width - 1,
        Math.floor(((x + 0.5) * raster.width) / size),
      );
      const source = (sourceY * raster.width + sourceX) * 4;
      const target = (y * size + x) * 4;
      data[target] = raster.data[source] ?? 0;
      data[target + 1] = raster.data[source + 1] ?? 0;
      data[target + 2] = raster.data[source + 2] ?? 0;
      data[target + 3] = raster.data[source + 3] ?? 255;
    }
  }
  return { width: size, height: size, data };
}

function encodePng(raster: Raster): string {
  const png = new PNG({ width: raster.width, height: raster.height });
  png.data = Buffer.from(raster.data);
  return PNG.sync.write(png).toString("base64");
}

export function splitItemStateGrid(input: {
  bytesBase64: string;
  mimeType: string;
  stateIds: readonly string[];
  maxOutputSize?: number;
}): readonly ItemStatePanel[] {
  if (input.stateIds.length < 1 || input.stateIds.length > 4) {
    throw new Error("ITEM_STATE_GRID_PANEL_COUNT_INVALID");
  }
  const maxOutputSize = input.maxOutputSize ?? 300;
  if (
    !Number.isInteger(maxOutputSize) ||
    maxOutputSize < 64 ||
    maxOutputSize > 1024
  ) {
    throw new Error("ITEM_STATE_GRID_OUTPUT_SIZE_INVALID");
  }

  const raster = decodeRaster(input.bytesBase64, input.mimeType);
  const grid = layout(input.stateIds.length);
  const cellWidth = Math.floor(raster.width / grid.columns);
  const cellHeight = Math.floor(raster.height / grid.rows);
  if (cellWidth < 64 || cellHeight < 64) {
    throw new Error("ITEM_STATE_GRID_SOURCE_TOO_SMALL");
  }

  return input.stateIds.map((stateId, index) => {
    const column = index % grid.columns;
    const row = Math.floor(index / grid.columns);
    const cropped = cropSquare(
      raster,
      column * cellWidth,
      row * cellHeight,
      cellWidth,
      cellHeight,
    );
    const resized = resizeSquare(cropped, maxOutputSize);
    return {
      stateId,
      bytesBase64: encodePng(resized),
      mimeType: "image/png" as const,
      width: resized.width,
      height: resized.height,
    };
  });
}
