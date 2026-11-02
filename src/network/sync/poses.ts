import { encodeWireDirection } from "./net-wire";

/*
 * Poses: where every character in a room is, sent whole on every tick. Each tick stands alone, so
 * a lost or late one costs nothing: the next replaces it. Everything else about a character goes
 * out only when it changes, see `statuses.ts`.
 */

/** One character's position on a tick: `[id, x, y, vx, vy, facing]`, facing as `encodeWireDirection`. */
export type Pose = [id: string, x: number, y: number, vx: number, vy: number, d: number];

/** A room's poses on one tick. */
export interface RoomPoses {
  /** Server time of the tick, ms. */
  t: number;
  /** Players. */
  p: Pose[];
  /** NPCs. */
  n: Pose[];
}

/** What a pose is read from. Players are keyed by `socketId`, npcs by `id`. */
export interface PoseInput {
  id?: string;
  socketId?: string;
  room?: { name?: string } | null;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  direction?: string;
}

/** One decimal: below a pixel, and much shorter on the wire than a full float. */
const tenth = (n: number | undefined) => Math.round((n ?? 0) * 10) / 10;

export function encodePose(c: PoseInput): Pose {
  return [
    (c.socketId || c.id) as string,
    tenth(c.x),
    tenth(c.y),
    tenth(c.vx),
    tenth(c.vy),
    encodeWireDirection(c.direction),
  ];
}

export function getRoomPoses(
  world: {
    players: Readonly<Record<string, PoseInput>>;
    npcs: Readonly<Record<string, PoseInput>>;
  },
  roomName: string,
  now: number,
): RoomPoses {
  const inRoom = (c: PoseInput) => c?.room?.name === roomName;
  return {
    t: now,
    p: Object.values(world.players).filter(inRoom).map(encodePose),
    n: Object.values(world.npcs).filter(inRoom).map(encodePose),
  };
}
