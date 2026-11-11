/** How the open sky lights the world at one moment. */
export interface SkyLight {
  /** Multiplied over the world: white leaves it as drawn, darker colors dim it. */
  tint: number;
  /** -1 drains all color, 0 leaves it, above 0 makes it richer. */
  saturation: number;
  /** How dark it gets away from the player, 0 to 1. */
  vignette: number;
}

const NIGHT: SkyLight = { tint: 0x39488a, saturation: -0.45, vignette: 0.85 };
const DAY: SkyLight = { tint: 0xffffff, saturation: 0.15, vignette: 0 };

/**
 * The sky at keyed hours; the hours between blend the two around them. Dawn and dusk only dim
 * the day, in plain grays, before night's blue takes over.
 */
const SKY_BY_HOUR: ReadonlyArray<readonly [hour: number, light: SkyLight]> = [
  [0, NIGHT],
  [4.5, NIGHT],
  [6, { tint: 0xa8aab4, saturation: -0.1, vignette: 0.4 }],
  [7.5, DAY],
  [17, DAY],
  [18.5, { tint: 0xc8c8c8, saturation: 0, vignette: 0.2 }],
  [20, { tint: 0x6a7090, saturation: -0.3, vignette: 0.65 }],
  [21.5, NIGHT],
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
