import type { ThemeUIStyleObject } from "theme-ui";

/** Swing angles, growing as a spring-loaded menu gets closer to opening. */
const SWINGS = [-3, 3, -5, 5, -7, 7, -10, 10];

/**
 * Makes a dragged item wiggle harder and harder while it rests on a spring-loaded button, then hop
 * as the menu opens. `base` is the transform the item already has, kept under the wiggle.
 */
export function springWiggle(name: string, base: string): ThemeUIStyleObject {
  const frames: Record<string, { transform: string }> = { "0%": { transform: base } };
  SWINGS.forEach((deg, i) => {
    frames[`${(i + 1) * 10}%`] = { transform: `${base} rotate(${deg}deg)` };
  });
  frames["92%"] = { transform: `${base} translateY(-12%) scale(1.15)` };
  frames["100%"] = { transform: base };
  return {
    [`@keyframes ${name}`]: frames,
    animation: `${name} 1s ease-in forwards`,
  };
}
