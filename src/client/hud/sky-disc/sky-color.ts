const DAY = 0x6cb4ec;
const NIGHT = 0x141c3c;

/** Sky colors at keyed hours; the hours between blend the two around them. */
const SKY_BY_HOUR: ReadonlyArray<readonly [hour: number, color: number]> = [
  [0, NIGHT],
  /* Day and night, with a short blend as the sun comes up and goes down */
  [5.5, NIGHT],
  [6.5, DAY],
  [18.5, DAY],
  [19.5, NIGHT],
  [24, NIGHT],
];

const mixColor = (from: number, to: number, t: number) =>
  [16, 8, 0].reduce((color, shift) => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return color | (Math.round(a + (b - a) * t) << shift);
  }, 0);

/** The sky's color at an hour from 0 to 24, as a CSS color. */
export function skyColorAt(hour: number): string {
  const next = SKY_BY_HOUR.findIndex(([at]) => at > hour);
  const color =
    next <= 0
      ? SKY_BY_HOUR[next === 0 ? 0 : SKY_BY_HOUR.length - 1][1]
      : mixColor(
          SKY_BY_HOUR[next - 1][1],
          SKY_BY_HOUR[next][1],
          (hour - SKY_BY_HOUR[next - 1][0]) / (SKY_BY_HOUR[next][0] - SKY_BY_HOUR[next - 1][0]),
        );
  return `#${color.toString(16).padStart(6, "0")}`;
}

/** Whether the sun is up: it rises at 6:00 and sets at 19:00. */
export const isDaytime = (hour: number) => hour >= 6 && hour < 19;
