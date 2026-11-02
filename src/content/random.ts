/**
 * Everything random an item needs: rolls and a fresh id. Passed in, never global, so a seeded
 * world rolls the same items every run.
 */
export interface Dice {
  /** A number in [0, 1), like `Math.random`. */
  random: () => number;
  newId: () => string;
}

/** Fixed dice for showing an item (tooltips, quest rewards) where nothing is really rolled. */
export const PREVIEW_DICE: Dice = { random: () => 0.5, newId: () => "preview" };

/** Random integer between `min` and `max`, both included. */
export function randomNumber(dice: Dice, min: number, max: number): number {
  if (max <= min) return min;
  return Math.floor(dice.random() * (max - min + 1)) + min;
}

/** Deep copy of plain JSON data. Returns null for a falsy input. */
export function cloneJson<T>(value: T): T {
  return (value ? JSON.parse(JSON.stringify(value)) : null) as T;
}
