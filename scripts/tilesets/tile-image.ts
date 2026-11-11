import fs from "node:fs";
import { PNG } from "pngjs";

export const TILE = 32;
/** The game's sheets pad each tile with a copy of its edge pixels, so scaled tiles never bleed. */
const MARGIN = 1;
const SPACING = 2;

export const readPng = (file: string) => PNG.sync.read(fs.readFileSync(file));
export const writePng = (file: string, png: PNG) => fs.writeFileSync(file, PNG.sync.write(png));

/** The magenta the sheets fill empty slots with: (255, 0, 225) or (225, 0, 255). */
const isEmptyMarker = (data: Buffer, at: number) =>
  data[at] > 200 && data[at + 1] < 20 && data[at + 2] > 200 && data[at + 3] > 0;

/** Turn the exports' magenta empty-slot fill transparent. */
export const clearEmptyMarker = (png: PNG) => {
  for (let at = 0; at < png.data.length; at += 4)
    if (isEmptyMarker(png.data, at)) png.data.fill(0, at, at + 4);
  return png;
};

/** Catmull-Rom cubic: Photoshop-style "bicubic", smooth without blurring. */
const cubic = (distance: number) => {
  const x = Math.abs(distance);
  if (x < 1) return 1.5 * x ** 3 - 2.5 * x ** 2 + 1;
  if (x < 2) return -0.5 * x ** 3 + 2.5 * x ** 2 - 4 * x + 2;
  return 0;
};

/** For each output pixel of a tile, the source pixels (within that tile) and their weights. */
const tileWeights = (factor: number) =>
  Array.from({ length: TILE }, (_, out) => {
    const center = (out + 0.5) * factor - 0.5;
    const taps: [number, number][] = [];
    for (let at = Math.floor(center - 2 * factor); at <= Math.ceil(center + 2 * factor); at++) {
      const weight = cubic((at - center) / factor);
      if (weight) taps.push([Math.min(TILE * factor - 1, Math.max(0, at)), weight]);
    }
    const total = taps.reduce((sum, [, weight]) => sum + weight, 0);
    return taps.map(([at, weight]) => [at, weight / total] as const);
  });

/**
 * Shrink by a whole factor with a bicubic filter, one tile at a time so no tile ever picks up its
 * neighbor's pixels: edges stay clean and tiles line up. Colors are weighted by alpha, so
 * transparent pixels never darken an edge.
 */
export const downscale = (source: PNG, factor: number) => {
  const out = new PNG({ width: source.width / factor, height: source.height / factor });
  const weights = tileWeights(factor);
  const span = TILE * factor;
  const rows = new Float32Array(TILE * span * 4);
  for (let tileY = 0; tileY < out.height / TILE; tileY++)
    for (let tileX = 0; tileX < out.width / TILE; tileX++) {
      const left = tileX * span;
      const top = tileY * span;
      for (let y = 0; y < span; y++)
        for (let x = 0; x < TILE; x++) {
          const sum = [0, 0, 0, 0];
          for (const [at, weight] of weights[x]) {
            const pixel = ((top + y) * source.width + left + at) * 4;
            const alpha = (source.data[pixel + 3] / 255) * weight;
            sum[0] += source.data[pixel] * alpha;
            sum[1] += source.data[pixel + 1] * alpha;
            sum[2] += source.data[pixel + 2] * alpha;
            sum[3] += alpha;
          }
          rows.set(sum, (y * TILE + x) * 4);
        }
      for (let y = 0; y < TILE; y++)
        for (let x = 0; x < TILE; x++) {
          const sum = [0, 0, 0, 0];
          for (const [at, weight] of weights[y])
            for (let channel = 0; channel < 4; channel++)
              sum[channel] += rows[(at * TILE + x) * 4 + channel] * weight;
          const to = ((tileY * TILE + y) * out.width + tileX * TILE + x) * 4;
          const alpha = Math.min(1, Math.max(0, sum[3]));
          if (alpha > 0)
            for (let channel = 0; channel < 3; channel++)
              out.data[to + channel] = Math.min(
                255,
                Math.max(0, Math.round(sum[channel] / sum[3])),
              );
          out.data[to + 3] = Math.round(alpha * 255);
        }
    }
  return out;
};

/** Copy one tile from `source` (column, row) to `target` (column, row), optionally cut by a mask tile. */
export const copyTile = (
  source: PNG,
  from: readonly [number, number],
  target: PNG,
  to: readonly [number, number],
  mask?: { png: PNG; at: readonly [number, number] },
) => {
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const read = ((from[1] * TILE + y) * source.width + from[0] * TILE + x) * 4;
      const write = ((to[1] * TILE + y) * target.width + to[0] * TILE + x) * 4;
      source.data.copy(target.data, write, read, read + 4);
      if (mask) {
        const cut = ((mask.at[1] * TILE + y) * mask.png.width + mask.at[0] * TILE + x) * 4;
        target.data[write + 3] = Math.round(
          (target.data[write + 3] * mask.png.data[cut + 3]) / 255,
        );
      }
    }
};

/** Whether a tile has any visible pixel. */
export const tileIsEmpty = (png: PNG, column: number, row: number) => {
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++)
      if (png.data[((row * TILE + y) * png.width + column * TILE + x) * 4 + 3]) return false;
  return true;
};

/** Lay tiles out with a margin and spacing, each padded by repeating its edge pixels. */
export const extrude = (sheet: PNG) => {
  const columns = sheet.width / TILE;
  const rows = sheet.height / TILE;
  const step = TILE + SPACING;
  const out = new PNG({
    width: columns * step - SPACING + MARGIN * 2,
    height: rows * step - SPACING + MARGIN * 2,
  });
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++)
      for (let y = -1; y <= TILE; y++)
        for (let x = -1; x <= TILE; x++) {
          const sx = column * TILE + Math.min(TILE - 1, Math.max(0, x));
          const sy = row * TILE + Math.min(TILE - 1, Math.max(0, y));
          const read = (sy * sheet.width + sx) * 4;
          const write = ((MARGIN + row * step + y) * out.width + MARGIN + column * step + x) * 4;
          sheet.data.copy(out.data, write, read, read + 4);
        }
  return out;
};
