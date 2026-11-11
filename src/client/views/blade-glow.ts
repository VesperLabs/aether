/** How a weapon's glow looks this moment: its color, width and strength. */
interface Glow {
  color: number;
  radius: number;
  intensity: number;
}

/** Uneven wobble, -1 to 1: two waves at unrelated speeds, so it never settles into a pulse. */
const wobble = (seconds: number, speed: number) =>
  (Math.sin(seconds * speed) + Math.sin(seconds * speed * 2.7 + 1.3)) / 2;

/** How bright, 0 to 1 around `base`, by how much (`depth`). */
const around = (base: number, depth: number, wave: number) =>
  base * (1 - depth / 2 + (depth / 2) * wave);

/**
 * Each element's glow at night, stretched along the blade by the weapon, and how it moves:
 * fire flickers hard, light crackles in bright snaps like its bolts, water swells slowly, holy
 * holds steady and wide, earth barely shows.
 */
const ELEMENT_GLOWS: Record<string, (seconds: number) => Glow> = {
  fire: (s) => ({ color: 0xff7a2a, radius: 22, intensity: around(0.75, 0.35, wobble(s, 8)) }),
  light: (s) => {
    /* Mostly a low hum, with a sharp flash for a moment a few times a second */
    const snap = Math.max(0, Math.sin(s * 13) * Math.sin(s * 5.3)) ** 6;
    return { color: 0xfff07a, radius: 22 + 8 * snap, intensity: 0.45 + 0.5 * snap };
  },
  water: (s) => ({
    color: 0x5aa8ff,
    radius: 18 + 3 * Math.sin(s * 1.2),
    intensity: around(0.5, 0.25, Math.sin(s * 1.2)),
  }),
  holy: (s) => ({ color: 0xf4f8ff, radius: 28, intensity: around(0.6, 0.06, Math.sin(s * 1.5)) }),
  earth: (s) => ({ color: 0x8ab060, radius: 16, intensity: around(0.3, 0.05, Math.sin(s * 0.8)) }),
};

/** The glow of `element` at `seconds`, or nothing for an element that doesn't glow. */
export function bladeGlow(element: string | undefined, seconds: number): Glow | undefined {
  return element ? ELEMENT_GLOWS[element]?.(seconds) : undefined;
}
