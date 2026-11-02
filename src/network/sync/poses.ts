import { encodeWireDirection } from "./net-wire";

/*
 * Poses: where every character in a room is, sent whole on every tick. Each tick stands alone, so
 * a lost or late one costs nothing: the next replaces it. Everything else about a character goes
 * out only when it changes, see `statuses.ts`.
 *
 * On the wire a tick is binary: the server time, the player and npc counts, then per character its
 * net id (see `net-ids.ts`), x, y, vx, vy and facing.
 */

/** One character's position on a tick: `[id, x, y, vx, vy, facing]`, facing as `encodeWireDirection`. */
export type Pose = [id: string, x: number, y: number, vx: number, vy: number, d: number];

/** A room's poses on one tick, decoded. */
export interface RoomPoses {
  /** Server time of the tick, ms. */
  t: number;
  /** Players. */
  p: Pose[];
  /** NPCs. */
  n: Pose[];
}

/** What a pose is read from. */
export interface PoseInput {
  /** Net id, see `net-ids.ts`. */
  nid: number;
  room?: { name?: string } | null;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  direction?: string;
}

const HEADER_BYTES = 12;
const POSE_BYTES = 19;

function writePose(view: DataView, at: number, c: PoseInput) {
  view.setUint16(at, c.nid);
  view.setFloat32(at + 2, c.x ?? 0);
  view.setFloat32(at + 6, c.y ?? 0);
  view.setFloat32(at + 10, c.vx ?? 0);
  view.setFloat32(at + 14, c.vy ?? 0);
  view.setUint8(at + 18, encodeWireDirection(c.direction));
}

/** Packs every character in a room into one tick. */
export function encodeRoomPoses(
  world: {
    players: Readonly<Record<string, PoseInput>>;
    npcs: Readonly<Record<string, PoseInput>>;
  },
  roomName: string,
  now: number,
): ArrayBuffer {
  const inRoom = (c: PoseInput) => c?.room?.name === roomName;
  const players = Object.values(world.players).filter(inRoom);
  const npcs = Object.values(world.npcs).filter(inRoom);
  const buffer = new ArrayBuffer(HEADER_BYTES + (players.length + npcs.length) * POSE_BYTES);
  const view = new DataView(buffer);
  view.setFloat64(0, now);
  view.setUint16(8, players.length);
  view.setUint16(10, npcs.length);
  let at = HEADER_BYTES;
  for (const c of [...players, ...npcs]) {
    writePose(view, at, c);
    at += POSE_BYTES;
  }
  return buffer;
}

/** Unpacks a tick. `idOf` turns net ids back into character ids; unknown ones are skipped. */
export function decodeRoomPoses(
  data: ArrayBuffer | ArrayBufferView,
  idOf: (nid: number) => string | undefined,
): RoomPoses {
  const view = ArrayBuffer.isView(data)
    ? new DataView(data.buffer, data.byteOffset, data.byteLength)
    : new DataView(data);
  const read = (count: number, from: number) => {
    const out: Pose[] = [];
    for (let i = 0; i < count; i++) {
      const at = from + i * POSE_BYTES;
      const id = idOf(view.getUint16(at));
      if (id === undefined) continue;
      out.push([
        id,
        view.getFloat32(at + 2),
        view.getFloat32(at + 6),
        view.getFloat32(at + 10),
        view.getFloat32(at + 14),
        view.getUint8(at + 18),
      ]);
    }
    return out;
  };
  const players = view.getUint16(8);
  return {
    t: view.getFloat64(0),
    p: read(players, HEADER_BYTES),
    n: read(view.getUint16(10), HEADER_BYTES + players * POSE_BYTES),
  };
}
