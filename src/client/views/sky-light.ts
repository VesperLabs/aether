/** How the open sky lights the world at one moment. */
export interface SkyLight {
  /** Multiplied over the world: white leaves it as drawn, darker colors dim it. */
  tint: number;
  /** Added over the world: a faint warm wash at sunrise and golden hour, black (none) otherwise. */
  glow: number;
  /** -1 drains all color, 0 leaves it, above 0 makes it richer. */
  saturation: number;
  /** How dark it gets away from the player, 0 to 1. */
  vignette: number;
}

const NIGHT: SkyLight = { tint: 0x39488a, glow: 0x000000, saturation: -0.45, vignette: 0.85 };
const DAY: SkyLight = { tint: 0xfff9ee, glow: 0x000000, saturation: 0.15, vignette: 0 };

/** The sky at keyed hours; the hours between blend the two around them. */
const SKY_BY_HOUR: ReadonlyArray<readonly [hour: number, light: SkyLight]> = [
  [0, NIGHT],
  [4.5, NIGHT],
  /* Lavender first light, then gold as the sun clears the hills */
  [5.75, { tint: 0x9a80b4, glow: 0x000000, saturation: -0.15, vignette: 0.55 }],
  [6.75, { tint: 0xffd4aa, glow: 0x1c0f04, saturation: 0.1, vignette: 0.2 }],
  [8, DAY],
  [16.5, DAY],
  /* Golden hour, then a magenta sunset sinking into blue */
  [18, { tint: 0xffc68c, glow: 0x241204, saturation: 0.25, vignette: 0.2 }],
  [19.25, { tint: 0xd47a92, glow: 0x0c0408, saturation: 0, vignette: 0.55 }],
  [20.5, { tint: 0x4a5298, glow: 0x000000, saturation: -0.35, vignette: 0.8 }],
  [22, NIGHT],
  [24, NIGHT],
];

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

const mixColor = (from: number, to: number, t: number) =>
  [16, 8, 0].reduce((color, shift) => {
    const value = Math.round(lerp((from >> shift) & 0xff, (to >> shift) & 0xff, t));
    return color | (value << shift);
  }, 0);

const mixLight = (from: SkyLight, to: SkyLight, t: number): SkyLight => ({
  tint: mixColor(from.tint, to.tint, t),
  glow: mixColor(from.glow, to.glow, t),
  saturation: lerp(from.saturation, to.saturation, t),
  vignette: lerp(from.vignette, to.vignette, t),
});

/** The sky's light for an hour from 0 to 24. */
export function skyLightAt(hour: number): SkyLight {
  const next = SKY_BY_HOUR.findIndex(([at]) => at > hour);
  if (next <= 0) return SKY_BY_HOUR[next === 0 ? 0 : SKY_BY_HOUR.length - 1][1];
  const [fromHour, from] = SKY_BY_HOUR[next - 1];
  const [toHour, to] = SKY_BY_HOUR[next];
  return mixLight(from, to, (hour - fromHour) / (toHour - fromHour));
}
