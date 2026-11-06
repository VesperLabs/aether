/** RGBA pixels and their size. */
export type Pixels = { data: Uint8ClampedArray; width: number; height: number };

const blank = (width: number, height: number): Pixels => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height * 4),
});

const getAlpha = ({ data, width, height }: Pixels, x: number, y: number) =>
  x < 0 || y < 0 || x >= width || y >= height ? 0 : data[(y * width + x) * 4 + 3];

/** How far above green red and blue must both sit: catches magenta and its blends with the art. */
const MAGENTA_MARGIN = 80;
const FRINGE_MARGIN = 20;

const getPinkness = (data: Uint8ClampedArray, p: number) =>
  Math.min(data[p], data[p + 2]) - data[p + 1];

/** The middle pixel by brightness, so the result is a colour the image really has. */
const getMiddlePixel = (data: Uint8ClampedArray, pixels: number[]) => {
  const brightness = (p: number) => data[p] + data[p + 1] + data[p + 2];
  return [...pixels].sort((a, b) => brightness(a) - brightness(b))[pixels.length >> 1];
};

/** Clears outer pixels still tinted pink. Inner art is left alone, so pink gear stays pink. */
const clearPinkEdges = (cell: Pixels) => {
  const out = { ...cell, data: cell.data.slice() };
  for (let y = 0; y < cell.height; y += 1) {
    for (let x = 0; x < cell.width; x += 1) {
      if (!getAlpha(cell, x, y)) continue;
      const isEdge = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ].some(([nx, ny]) => !getAlpha(cell, nx, ny));
      const p = (y * cell.width + x) * 4;
      if (isEdge && getPinkness(cell.data, p) > FRINGE_MARGIN) out.data[p + 3] = 0;
    }
  }
  return out;
};

/**
 * Shrinks a generated image to one cell and cuts out its magenta. Each cell pixel looks at the whole
 * block it covers: only pure background goes clear, so thin limbs survive, and otherwise it takes a
 * pixel from the art alone, so the magenta blended into the art's edges can't survive as a pink
 * outline.
 */
export const toCell = (image: Pixels, size: number) => {
  const cell = blank(size, size);
  const scaleX = image.width / size;
  const scaleY = image.height / size;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const art: number[] = [];
      const right = Math.max(Math.floor((x + 1) * scaleX), Math.floor(x * scaleX) + 1);
      const bottom = Math.max(Math.floor((y + 1) * scaleY), Math.floor(y * scaleY) + 1);
      for (let py = Math.floor(y * scaleY); py < bottom; py += 1) {
        for (let px = Math.floor(x * scaleX); px < right; px += 1) {
          const p = (py * image.width + px) * 4;
          if (getAlpha(image, px, py) && getPinkness(image.data, p) <= MAGENTA_MARGIN) art.push(p);
        }
      }
      if (!art.length) continue;
      const p = getMiddlePixel(image.data, art);
      cell.data.set(image.data.subarray(p, p + 4), (y * size + x) * 4);
    }
  }
  return clearPinkEdges(cell);
};

/** The box of rows and columns holding at least `minCount` art pixels, so specks don't stretch it. */
const getArtBounds = (image: Pixels, minCount: number) => {
  const { data, width, height } = image;
  const columns = new Array<number>(width).fill(0);
  const rows = new Array<number>(height).fill(0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = (y * width + x) * 4;
      if (!data[p + 3] || getPinkness(data, p) > MAGENTA_MARGIN) continue;
      columns[x] += 1;
      rows[y] += 1;
    }
  }
  const left = columns.findIndex((count) => count >= minCount);
  const top = rows.findIndex((count) => count >= minCount);
  if (left < 0 || top < 0) return undefined;
  const right = columns.findLastIndex((count) => count >= minCount);
  const bottom = rows.findLastIndex((count) => count >= minCount);
  return { top, height: bottom - top + 1, centerX: (left + right + 1) / 2 };
};

/** A row or column of a drawing needs this share of a side (1 in n) to count as art. */
const MIN_ART_SHARE = 200;

/**
 * Crops a drawing so that, once shrunk to a cell, its art spans the same rows as `original` and sits
 * centred on it. The scale is even, so width follows and proportions hold. Art with nothing to
 * measure against is returned as it is.
 */
export const matchHeight = (image: Pixels, original: Pixels) => {
  const from = getArtBounds(image, Math.ceil(image.width / MIN_ART_SHARE));
  const to = getArtBounds(original, 1);
  if (!from || !to) return image;
  const block = from.height / to.height;
  const side = Math.round(original.width * block);
  const left = Math.round(from.centerX - to.centerX * block);
  const top = Math.round(from.top - to.top * block);
  const out = blank(side, side);
  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      if (!getAlpha(image, x + left, y + top)) continue;
      const p = ((y + top) * image.width + x + left) * 4;
      out.data.set(image.data.subarray(p, p + 4), (y * side + x) * 4);
    }
  }
  return out;
};

/** How far a colour can sit from the body's own and still count as the body, squared per channel. */
const BODY_COLOR_DISTANCE = 40 ** 2;
/** How far a redrawn body can drift: its colours are looked for this close to each pixel. */
const BODY_MATCH_REACH = 1;
/** Matching pixels fewer than this are left alone: real skin comes in bigger patches. */
const MIN_BODY_PATCH = 12;
/** How far a redrawn body outline can land from the real one. */
const OUTLINE_REACH = 2;
/** Red, green and blue added up: anything under this counts as an outline colour. */
const MAX_OUTLINE_BRIGHTNESS = 180;

const isNear = (
  image: Pixels,
  x: number,
  y: number,
  reach: number,
  test: (nx: number, ny: number) => boolean,
) => {
  for (let ny = y - reach; ny <= y + reach; ny += 1) {
    for (let nx = x - reach; nx <= x + reach; nx += 1) {
      if (nx >= 0 && ny >= 0 && nx < image.width && ny < image.height && test(nx, ny)) return true;
    }
  }
  return false;
};

const isDark = ({ data, width }: Pixels, x: number, y: number) => {
  const p = (y * width + x) * 4;
  return data[p] + data[p + 1] + data[p + 2] < MAX_OUTLINE_BRIGHTNESS;
};

/**
 * Clears the body's outline where it was redrawn a pixel off: dark pixels hugging the body with no
 * lighter art beside them. Clothing's own outline has its fill next to it, so it stays.
 */
const clearStrayOutline = (dressed: Pixels, body: Pixels) => {
  const out = { ...dressed, data: dressed.data.slice() };
  for (let y = 0; y < dressed.height; y += 1) {
    for (let x = 0; x < dressed.width; x += 1) {
      if (!getAlpha(dressed, x, y) || !isDark(dressed, x, y)) continue;
      const hugsBody = isNear(body, x, y, OUTLINE_REACH, (nx, ny) => getAlpha(body, nx, ny) > 0);
      const hasFill = isNear(
        dressed,
        x,
        y,
        1,
        (nx, ny) => getAlpha(dressed, nx, ny) > 0 && !isDark(dressed, nx, ny),
      );
      if (hugsBody && !hasFill) out.data[(y * dressed.width + x) * 4 + 3] = 0;
    }
  }
  return out;
};

/**
 * Takes the body back out of a drawing of it dressed, leaving the clothing. A pixel goes if it sits
 * on the body, matches the body right there, and belongs to a large patch reaching the art's edge.
 * Highlights are small or sit inside the clothing, so they're never taken.
 */
export const removeBody = (dressed: Pixels, body: Pixels) => {
  const { width, height } = dressed;
  const matches = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!getAlpha(dressed, x, y) || !getAlpha(body, x, y)) continue;
      const p = (y * width + x) * 4;
      const isBody = isNear(body, x, y, BODY_MATCH_REACH, (nx, ny) => {
        const q = (ny * body.width + nx) * 4;
        return (
          body.data[q + 3] > 0 &&
          (dressed.data[p] - body.data[q]) ** 2 +
            (dressed.data[p + 1] - body.data[q + 1]) ** 2 +
            (dressed.data[p + 2] - body.data[q + 2]) ** 2 <
            BODY_COLOR_DISTANCE
        );
      });
      if (isBody) matches[y * width + x] = 1;
    }
  }

  const out = { ...dressed, data: dressed.data.slice() };
  const seen = new Uint8Array(width * height);
  for (let start = 0; start < width * height; start += 1) {
    if (!matches[start] || seen[start]) continue;
    seen[start] = 1;
    const patch = [start];
    let reachesEdge = false;
    for (let i = 0; i < patch.length; i += 1) {
      const px = patch[i] % width;
      const py = (patch[i] - px) / width;
      for (const [nx, ny] of [
        [px - 1, py],
        [px + 1, py],
        [px, py - 1],
        [px, py + 1],
      ]) {
        if (!getAlpha(dressed, nx, ny)) reachesEdge = true;
        const near = ny * width + nx;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (!matches[near] || seen[near]) continue;
        seen[near] = 1;
        patch.push(near);
      }
    }
    if (!reachesEdge || patch.length < MIN_BODY_PATCH) continue;
    for (const pixel of patch) out.data[pixel * 4 + 3] = 0;
  }
  return clearStrayOutline(out, body);
};

/** The colours a sheet actually uses, ignoring see-through pixels. */
export const getPalette = (data: Uint8ClampedArray) => {
  const palette = new Map<number, [number, number, number]>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    palette.set(key, [data[i], data[i + 1], data[i + 2]]);
  }
  return [...palette.values()];
};

const getAverageColor = (data: Uint8ClampedArray) => {
  const total = [0, 0, 0];
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    for (let channel = 0; channel < 3; channel += 1) total[channel] += data[i + channel];
    count += 1;
  }
  return count ? total.map((sum) => sum / count) : undefined;
};

/**
 * Shifts a cell, in place, to the reference's average colour. Models light a whole drawing brighter
 * or darker, which palette snapping alone turns into the right colours on the wrong shades.
 */
export const matchShading = (data: Uint8ClampedArray, reference: Uint8ClampedArray) => {
  const drawn = getAverageColor(data);
  const wanted = getAverageColor(reference);
  if (!drawn || !wanted) return;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    for (let channel = 0; channel < 3; channel += 1) {
      data[i + channel] += Math.round(wanted[channel] - drawn[channel]);
    }
  }
};

/** Repaints a cell in only the given colours, in place, so it can't drift from the sheet's style. */
export const snapToPalette = (data: Uint8ClampedArray, palette: number[][]) => {
  if (!palette.length) return;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    let nearest = palette[0];
    let nearestDistance = Infinity;
    for (const color of palette) {
      const distance = (r - color[0]) ** 2 + (g - color[1]) ** 2 + (b - color[2]) ** 2;
      if (distance < nearestDistance) [nearest, nearestDistance] = [color, distance];
    }
    data.set([...nearest, 255], i);
  }
};
