import { findPath, type Pathfinder } from "./pathfinding";

/** How long a found path is trusted before it is searched again, ms. */
export const PATH_REPLAN_MS = 500;
/** How long to wait after a search found no way before trying again, ms. */
export const PATH_RETRY_MS = 1000;
/** How far (in tiles) the goal may move before the path is searched again early. */
const GOAL_DRIFT_TILES = 2;

/**
 * A walker's remembered path, so it is not searched again every tick. Searching is the costliest
 * thing an NPC does, and a goal it cannot reach would burn the whole search limit each time.
 */
export interface PathPlan {
  /** Where the path leads. */
  goal: { x: number; y: number };
  /** When it was searched, ms. */
  plannedAt: number;
  /** Tile centres still to walk through; undefined when the search found no way. */
  waypoints?: { x: number; y: number }[];
}

const tileOf = (pf: Pathfinder, p: { x: number; y: number }) => ({
  x: Math.floor(p.x / pf.tileWidth),
  y: Math.floor(p.y / pf.tileHeight),
});

function goalMoved(pf: Pathfinder, a: { x: number; y: number }, b: { x: number; y: number }) {
  const ta = tileOf(pf, a);
  const tb = tileOf(pf, b);
  return Math.max(Math.abs(ta.x - tb.x), Math.abs(ta.y - tb.y)) > GOAL_DRIFT_TILES;
}

/** The waypoints left once those whose tile `from` already stands in are dropped. */
function remaining(
  pf: Pathfinder,
  waypoints: { x: number; y: number }[],
  from: { x: number; y: number },
) {
  const here = tileOf(pf, from);
  const reached = waypoints.findIndex((w) => {
    const t = tileOf(pf, w);
    return t.x === here.x && t.y === here.y;
  });
  return reached === -1 ? waypoints : waypoints.slice(reached + 1);
}

/**
 * The next tile centre to walk to on the way to `to`, reusing `plan` while it is fresh, and the plan
 * to keep for next time. `next` is undefined when there is no way (or already there): walk straight.
 */
export function planNextWaypoint(
  pathfinder: Pathfinder,
  plan: PathPlan | undefined,
  from: { x: number; y: number },
  to: { x: number; y: number },
  now: number,
  radius = 0,
): { next?: { x: number; y: number }; plan: PathPlan } {
  if (plan && !goalMoved(pathfinder, plan.goal, to)) {
    const age = now - plan.plannedAt;
    if (!plan.waypoints) {
      if (age < PATH_RETRY_MS) return { plan };
    } else if (age < PATH_REPLAN_MS) {
      const waypoints = remaining(pathfinder, plan.waypoints, from);
      if (waypoints.length) return { next: waypoints[0], plan: { ...plan, waypoints } };
    }
  }
  const waypoints = findPath(pathfinder, from, to, [], radius);
  return { next: waypoints?.[0], plan: { goal: { x: to.x, y: to.y }, plannedAt: now, waypoints } };
}
