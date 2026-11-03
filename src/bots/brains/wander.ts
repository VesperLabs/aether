import type { Brain } from "./brain";

/** Chance per step of picking a new heading while walking. */
const TURN_CHANCE = 0.03;
/** Chance per step of setting off again while paused. */
const SET_OFF_CHANCE = 0.06;
/** Chance a new heading is to stand still for a while. */
const PAUSE_CHANCE = 0.2;

/** Random walk: keeps its heading, and now and then turns or pauses. */
export const wander: Brain = ({ last }, _tick, rng) => {
  const moving = last.move.x !== 0 || last.move.y !== 0;
  if (rng() >= (moving ? TURN_CHANCE : SET_OFF_CHANCE)) return last;
  if (moving && rng() < PAUSE_CHANCE) return { move: { x: 0, y: 0 } };
  const angle = rng() * Math.PI * 2;
  return { move: { x: Math.cos(angle), y: Math.sin(angle) } };
};
