import { integrate, moveBox } from "./collision";
import type { TileMap } from "./tilemap";

/** What the movement system reads and changes on a moving entity. */
export interface MovingBody {
  x: number;
  y: number;
  /** Velocity in pixels per second. */
  vx: number;
  vy: number;
}

/**
 * Half the size of the square walls stop an NPC with. Fixed, whatever the NPC's profile scale,
 * like the radius Phaser Arcade used.
 */
export const NPC_WALL_RADIUS = 8;

/** Moves an entity along its velocity, stopped by walls and the map edge. */
export function moveBodyThroughMap(
  map: TileMap,
  body: MovingBody,
  seconds: number,
  radius = NPC_WALL_RADIUS,
) {
  if (!body.vx && !body.vy) return;
  const result = moveBox(
    map.grid,
    { width: map.widthInPixels, height: map.heightInPixels },
    { x: body.x, y: body.y, halfWidth: radius, halfHeight: radius },
    { x: body.vx, y: body.vy },
    seconds,
  );
  body.x = result.x;
  body.y = result.y;
}

/** Moves something that flies (a spell) along its velocity, ignoring walls. */
export function moveBodyFreely(
  body: { x: number; y: number },
  velocity: { x: number; y: number },
  seconds: number,
) {
  const next = integrate(body, velocity, seconds);
  body.x = next.x;
  body.y = next.y;
}
