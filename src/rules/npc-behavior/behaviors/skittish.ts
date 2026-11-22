import { behaviorOptions } from "../behavior-options";
import {
  SKITTISH_ARRIVED,
  SKITTISH_CALM_MS,
  SKITTISH_ESCAPE_MAX,
  SKITTISH_ESCAPE_MIN,
  SKITTISH_ESCAPE_VEER,
  SKITTISH_RANGE,
  SKITTISH_SPEED_RATIO,
} from "../constants";
import type { Point, Rng } from "@/rules/world";
import type { BehaviorContext, NpcBehavior } from "./types";
import { distanceBetween } from "../range";
import { wander } from "./wander";

const optionsOf = (ctx: BehaviorContext) => behaviorOptions(ctx.input.npc, "skittish");

/** How fast it gets away, as a share of its walk speed. */
const speedOf = (ctx: BehaviorContext) => {
  const options = optionsOf(ctx);
  return (options && options.speed) || SKITTISH_SPEED_RATIO;
};

/** The living player inside its range, if one is. */
function intruder(ctx: BehaviorContext) {
  const options = optionsOf(ctx);
  const near = ctx.input.nearestPlayer;
  if (!options || !near || near.isDead) return undefined;
  return distanceBetween(ctx.input.npc, near) <= (options.range ?? SKITTISH_RANGE)
    ? near
    : undefined;
}

/**
 * Still on its way to its escape spot, and not yet flying for longer than its calm time since it
 * was last scared (so a spot it can't quite reach never keeps it up forever).
 */
function isEscaping(ctx: BehaviorContext) {
  const options = optionsOf(ctx);
  const { scaredAt, escapeTo } = ctx.input.state;
  return (
    !!options &&
    !!escapeTo &&
    scaredAt !== undefined &&
    distanceBetween(ctx.input.npc, escapeTo) > SKITTISH_ARRIVED &&
    ctx.input.now - scaredAt < (options.calmMs ?? SKITTISH_CALM_MS)
  );
}

/** Headings it tries, as turns from straight away (radians), best first: round to a full turn back. */
const HEADINGS = [0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2, -2, 2.6, -2.6, Math.PI];
/** Shares of its escape distance it tries along each heading, furthest first. */
const REACH = [1, 0.6, 0.35];

/**
 * A spot well away from `threat` it can fly straight to: roughly away (veering a little, so a
 * flock scatters), else the nearest heading to that which is clear of walls and the map's edge,
 * nearer if need be. Cornered, it hovers where it is rather than fly into the wall.
 */
function escapeSpot(ctx: BehaviorContext, threat: Point, rng: Rng): Point | undefined {
  const { npc } = ctx.input;
  const canTravel = ctx.input.canTravel ?? (() => true);
  const away = Math.atan2(npc.y - threat.y, npc.x - threat.x);
  const veer = (rng() * 2 - 1) * SKITTISH_ESCAPE_VEER;
  const distance = SKITTISH_ESCAPE_MIN + rng() * (SKITTISH_ESCAPE_MAX - SKITTISH_ESCAPE_MIN);
  for (const share of REACH) {
    for (const turn of HEADINGS) {
      const angle = away + veer + turn;
      const to = {
        x: npc.x + Math.cos(angle) * distance * share,
        y: npc.y + Math.sin(angle) * distance * share,
      };
      if (canTravel(to)) return to;
    }
  }
  return undefined;
}

/**
 * Takes fright when anyone comes near: takes to its scared habitat (a bird takes off) and makes
 * for a spot well away, picking a new one if they follow it there. It lands the moment it gets
 * there, then wanders (and walks home) as before. Above leashing, so it may flee past home.
 */
export const skittish: NpcBehavior = {
  score: (ctx) => (intruder(ctx) ? 0.7 : isEscaping(ctx) ? 0.65 : 0),
  move: (ctx, rng) => {
    const { input } = ctx;
    const near = intruder(ctx);
    const current = input.state.escapeTo;
    const options = optionsOf(ctx);
    const range = (options && options.range) || SKITTISH_RANGE;
    if (near) {
      /* Keeps its spot unless it was never picked, it got there, or the intruder is near it too */
      const keep =
        current &&
        distanceBetween(input.npc, current) > SKITTISH_ARRIVED &&
        distanceBetween(near, current) > range * 2;
      const to = keep ? current : (escapeSpot(ctx, near, rng) ?? input.npc);
      return {
        type: "escape",
        to: { x: to.x, y: to.y },
        speedRatio: speedOf(ctx),
        scaredAt: input.now,
      };
    }
    if (current && isEscaping(ctx)) {
      return { type: "escape", to: current, speedRatio: speedOf(ctx) };
    }
    return wander.move(ctx, rng);
  },
  habitat: (ctx) => {
    const options = optionsOf(ctx);
    return options ? options.to : undefined;
  },
  holdsFire: true,
};
