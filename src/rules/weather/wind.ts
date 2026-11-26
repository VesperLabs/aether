import { roll } from "./roll";

/** The wind keeps its heading this long, so clouds don't swing about. */
export const WIND_SPELL_MS = 6 * 60 * 60 * 1000;
const WIND_SPEED_MIN = 6;
const WIND_SPEED_MAX = 14;
/** Drift is counted from here, so summing it stays a short loop: a few spells a day. */
const DRIFT_EPOCH = Date.UTC(2026, 0, 1);

/** The wind in a spell: its heading (radians, 0 east, down positive) and speed, px/s. */
function windOfSpell(spell: number) {
  return {
    windAngle: roll(spell, 3) * Math.PI * 2,
    windSpeed: WIND_SPEED_MIN + roll(spell, 4) * (WIND_SPEED_MAX - WIND_SPEED_MIN),
  };
}

/** The wind at `now` (a real date in ms). */
export const windAt = (now: number) => windOfSpell(Math.floor(now / WIND_SPELL_MS));

/**
 * How far the wind has carried anything since the drift began, px: each spell's wind for as long
 * as it blew, so it never jumps when the wind turns.
 */
export function driftAt(now: number): { x: number; y: number } {
  const first = Math.floor(DRIFT_EPOCH / WIND_SPELL_MS);
  const current = Math.floor(now / WIND_SPELL_MS);
  let x = 0;
  let y = 0;
  for (let spell = first; spell <= current; spell++) {
    const from = Math.max(spell * WIND_SPELL_MS, DRIFT_EPOCH);
    const to = spell === current ? now : (spell + 1) * WIND_SPELL_MS;
    const seconds = Math.max(0, to - from) / 1000;
    const { windAngle, windSpeed } = windOfSpell(spell);
    x += Math.cos(windAngle) * windSpeed * seconds;
    y += Math.sin(windAngle) * windSpeed * seconds;
  }
  return { x, y };
}
