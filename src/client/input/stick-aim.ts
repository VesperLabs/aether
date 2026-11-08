/**
 * Turns the right stick into a steady aim angle. Only the stick's direction matters for aiming,
 * and that direction is noisy where the stick barely leans, so:
 * - a dead zone (wider than walking's by default), where a small lean would swing the angle a long way
 * - letting go keeps the aim: a stick springing back to centre passes the opposite side
 * - the angle eases toward the stick, quicker the further it leans, smoothing out jitter
 */

/** Below this lean, a stick easing off (being let go) holds the aim instead of moving it. */
const RELEASE_LEAN = 0.75;
/** How far past the dead zone a stick must lean to move the aim while easing off. */
const RELEASE_MARGIN = 0.15;
/** How fast the aim catches up with the stick, per second, at full lean. */
const FOLLOW_RATE = 28;

export interface StickAim {
  angle: number | null;
  lean: number;
  at: number | null;
}

export const newStickAim = (): StickAim => ({ angle: null, lean: 0, at: null });

/** The shortest turn from `from` to `to`, from -π to π. */
const turn = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

/**
 * Advances `aim` by the stick at `x`, `y` (raw, -1 to 1) at `now` ms, ignoring leans under
 * `deadZone`; returns the angle, or null.
 */
export function stepStickAim(aim: StickAim, x: number, y: number, now: number, deadZone: number) {
  const lean = Math.min(1, Math.hypot(x, y));
  const dt = aim.at !== null ? Math.min(0.1, (now - aim.at) / 1000) : 0;
  const easingOff = lean < aim.lean;
  aim.at = now;
  aim.lean = lean;
  if (lean < deadZone) return aim.angle;
  const release = Math.max(RELEASE_LEAN, deadZone + RELEASE_MARGIN);
  if (easingOff && lean < release && aim.angle !== null) return aim.angle;
  const target = Math.atan2(y, x);
  if (aim.angle === null) return (aim.angle = target);
  /* Asked again in the same frame: no time has passed */
  if (!dt) return aim.angle;
  /* Eased by how far it leans: a full push follows at once, a light one fine-tunes */
  const follow = 1 - Math.exp(-dt * FOLLOW_RATE * lean * lean);
  return (aim.angle += turn(aim.angle, target) * follow);
}
