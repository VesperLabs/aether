/** Fog's color: a cool, pale grey-white. */
const FOG = [222, 228, 236];
/** The thickest a wisp gets, 0 to 255. */
const MAX_ALPHA = 235;

/** A steady 0..1 per grid point, wrapping every `period` cells so the texture tiles. */
function lattice(x: number, y: number, period: number, seed: number) {
  const wx = ((x % period) + period) % period;
  const wy = ((y % period) + period) % period;
  const s = Math.sin(wx * 127.1 + wy * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Smooth noise that tiles every `period` cells. */
export function tiledNoise(x: number, y: number, period: number, seed: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const at = (gx: number, gy: number) => lattice(gx, gy, period, seed);
  const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
  const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
  return top + (bottom - top) * sy;
}

/**
 * Wisps of fog, `size` px square, tiling seamlessly: layered noise (big banks, finer wisps on their
 * edges), a thin blanket between thick banks. RGBA.
 */
export function drawFogArt(size: number, seed: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  const base = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let total = 0;
      let weight = 0;
      for (let octave = 0, scale = 1; octave < 4; octave++, scale *= 2) {
        const period = base * scale;
        total +=
          tiledNoise((x / size) * period, (y / size) * period, period, seed + octave) / scale;
        weight += 1 / scale;
      }
      /* A blanket everywhere, with thicker banks rolling through it */
      const banks = Math.min(1, Math.max(0, (total / weight - 0.35) / 0.35));
      const soft = 0.45 + 0.55 * banks * banks * (3 - 2 * banks);
      const i = (y * size + x) * 4;
      data[i] = FOG[0];
      data[i + 1] = FOG[1];
      data[i + 2] = FOG[2];
      data[i + 3] = soft * MAX_ALPHA;
    }
  }
  return data;
}
