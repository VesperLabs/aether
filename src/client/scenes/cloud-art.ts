/** A cloud shadow's pixels, RGBA, `width` × `height`. */
export interface CloudArt {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** The one shade a shadow is drawn in, a cool near-black; its layer's alpha sets how dark it is. */
const SHADE = [8, 8, 20];

/** A steady 0..1 per shape and part, so a shape is the same every time it's drawn. */
export const cloudRoll = (shape: number, i: number, salt: number) => {
  const s = Math.sin(shape * 91.7 + i * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

interface Part {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

/**
 * A cloud: round puffs heaped together over a broad, flat base, big ones toward the middle and
 * smaller ones billowing round the rim. A long cloud spreads its heap out along it. Every puff
 * overlaps the heap, so none floats off on its own.
 */
function partsOf(shape: number, width: number, height: number): Part[] {
  const middleY = height * 0.58;
  const parts: Part[] = [{ x: width / 2, y: middleY, rx: height * 0.34, ry: height * 0.34 }];
  const count = 10 + Math.floor(cloudRoll(shape, 0, 0) * 6) + Math.round(width / height);
  for (let i = 1; i < count; i++) {
    const angle = cloudRoll(shape, i, 1) * Math.PI * 2;
    const reach = Math.sqrt(cloudRoll(shape, i, 2));
    const x = width / 2 + Math.cos(angle) * reach * (width / 2 - height * 0.3);
    const y = middleY + Math.sin(angle) * reach * height * 0.18;
    const r = height * (0.16 + (1 - reach) * 0.16 + cloudRoll(shape, i, 3) * 0.08);
    if (parts.some((p) => Math.hypot(x - p.x, y - p.y) < (r + p.rx) * 0.8)) {
      parts.push({ x, y, rx: r, ry: r });
    }
  }
  /* A few big puffs of mixed sizes along its top, so its edge billows */
  const spanX = width / 2 - height * 0.3;
  const rim = Math.round(3 + (width / height) * 1.5);
  for (let i = 0; i < rim; i++) {
    const along = rim > 1 ? i / (rim - 1) : 0.5;
    const jitter = (cloudRoll(shape, i, 9) - 0.5) * (1 / rim) * 0.6;
    const angle = Math.PI * (1.12 + (along + jitter) * 0.76);
    const r = height * (0.2 + cloudRoll(shape, i, 8) * 0.13);
    const x = width / 2 + Math.cos(angle) * spanX;
    const y = middleY + Math.sin(angle) * height * 0.2;
    parts.push({ x, y, rx: r, ry: r });
  }
  /* A flat base under the heap, no wider than it, so its bottom is level, never a brim */
  const left = Math.min(...parts.map((p) => p.x - p.rx));
  const right = Math.max(...parts.map((p) => p.x + p.rx));
  const base = {
    x: (left + right) / 2,
    y: height * 0.7,
    rx: (right - left) * 0.42,
    ry: height * 0.18,
  };
  return [base, ...parts];
}

/**
 * A cloud shadow's art: one solid, flat shape (overlapping clouds never darken each other, since
 * they are drawn into one layer before it is made see-through).
 */
export function drawCloudArt(shape: number, width: number, height: number): CloudArt {
  const parts = partsOf(shape, width, height);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inside = parts.some((part) => {
        const dx = (x + 0.5 - part.x) / part.rx;
        const dy = (y + 0.5 - part.y) / part.ry;
        return dx * dx + dy * dy <= 1;
      });
      if (!inside) continue;
      const [r, g, b] = SHADE;
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}
