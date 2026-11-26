import { tiledNoise } from "./fog-art";

/** A puff's lit top and shaded underside: cool pale grey-white over a bluer grey. */
const LIT = [236, 240, 246];
const SHADED = [206, 214, 226];
/** The thickest a puff gets, 0 to 255. */
const MAX_ALPHA = 150;

/** A steady 0..1 stream from a seed, so each variant draws the same every time. */
function seeded(seed: number) {
  let state = seed * 2654435761;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One ragged patch of mist, `size` px square. Its outline comes from noise, warped so it frays into
 * clumps and strands, and only fades out near the edge of the square, so it never reads as a round
 * or oval shape. Lit where it's thick on top, a little shaded below. RGBA.
 */
export function drawPuffArt(size: number, seed: number): Uint8ClampedArray {
  const random = seeded(seed + 1);
  const data = new Uint8ClampedArray(size * size * 4);
  const fbm = (x: number, y: number, salt: number) =>
    tiledNoise(x * 3, y * 3, 3, salt) * 0.5 +
    tiledNoise(x * 6, y * 6, 6, salt + 1) * 0.3 +
    tiledNoise(x * 12, y * 12, 12, salt + 2) * 0.2;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px + 0.5) / size;
      const y = (py + 0.5) / size;
      /* Warp where we look up the noise, so its clumps twist instead of sitting in a grid */
      const wx = x + (fbm(x, y, seed + 10) - 0.5) * 0.4;
      const wy = y + (fbm(x, y, seed + 20) - 0.5) * 0.4;
      const body = fbm(wx, wy, seed);
      /* Fade only near the square's edge, through the noise, so the rim is ragged */
      const dx = (x - 0.5) * 2;
      const dy = (y - 0.5) * 2;
      const rim = Math.max(0, 1 - (dx * dx + dy * dy) ** 1.5 - (body - 0.5) * 0.6);
      const thick = Math.max(0, Math.min(1, (body - 0.38) / 0.3)) * Math.min(1, rim * 1.6);
      const alpha = thick * thick * (3 - 2 * thick);
      /* Lighter where the mist above is thin (its top), darker under thick mist */
      const above = fbm(wx, wy - 0.06, seed);
      const shade = Math.max(0, Math.min(1, 0.4 + (above - body) * 4 + (y - 0.5) * 0.3));
      const i = (py * size + px) * 4;
      for (let c = 0; c < 3; c++) data[i + c] = LIT[c] + (SHADED[c] - LIT[c]) * shade;
      /* Dithered, so faint alpha never steps into visible bands */
      data[i + 3] = Math.max(0, alpha * MAX_ALPHA + random() - 0.5);
    }
  }
  return data;
}
