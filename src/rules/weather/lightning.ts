import { roll } from "./roll";

/** Time is cut into slots this long; a slot may hold one strike. */
const SLOT_MS = 4000;
/** How likely a slot strikes: one strike every 16 s or so, 8 to 25 s apart most often. */
const STRIKE_CHANCE = 0.25;
/** How likely a strike flickers twice. */
const DOUBLE_CHANCE = 0.4;
/** A flash's shape, ms: full at once, held, then fading out. */
const HOLD_MS = 60;
const FADE_MS = 260;
/** A double strike's second flash comes this long after the first, a little dimmer. */
const SECOND_MS = 170;
const SECOND_BRIGHTNESS = 0.7;

/** One flash's brightness `ms` after it struck, 0 to 1. */
function flash(ms: number) {
  if (ms < 0 || ms > HOLD_MS + FADE_MS) return 0;
  if (ms <= HOLD_MS) return 1;
  return 1 - (ms - HOLD_MS) / FADE_MS;
}

/**
 * How bright the lightning is at `now` (a real date in ms), 0 to 1, in a storm. Strikes come from
 * the time alone, so every player sees the same flash at the same moment.
 */
export function lightningAt(now: number): number {
  const slot = Math.floor(now / SLOT_MS);
  let brightest = 0;
  /* A flash that struck late in the last slot may still be fading */
  for (const s of [slot - 1, slot]) {
    if (roll(s, 11) >= STRIKE_CHANCE) continue;
    const struck = s * SLOT_MS + Math.floor(roll(s, 12) * (SLOT_MS - HOLD_MS - FADE_MS));
    let brightness = flash(now - struck);
    if (roll(s, 13) < DOUBLE_CHANCE) {
      brightness = Math.max(brightness, flash(now - struck - SECOND_MS) * SECOND_BRIGHTNESS);
    }
    brightest = Math.max(brightest, brightness);
  }
  return brightest;
}
