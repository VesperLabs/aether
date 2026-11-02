import { decodeRoomPoses, type FullCharacterWire } from "@/network";

/** A character as a bot sees it: where it is and whether it is still up. */
export interface SeenCharacter {
  id: string;
  name: string;
  kind: "player" | "npc";
  x: number;
  y: number;
  isDead: boolean;
}

/**
 * What a bot knows about its room, built only from what the server sends it (like the browser
 * client): join data gives names and net ids, binary poses move everyone each tick.
 */
export function createRoomView() {
  const characters = new Map<string, SeenCharacter>();
  const idsByNetId = new Map<number, string>();

  function add(wire: FullCharacterWire, kind: SeenCharacter["kind"]) {
    const id = (kind === "player" ? wire.socketId : wire.id) as string;
    idsByNetId.set(wire.nid, id);
    characters.set(id, {
      id,
      name: wire.profile?.userName ?? id,
      kind,
      x: wire.x,
      y: wire.y,
      isDead: !!wire.state?.isDead,
    });
  }

  return {
    characters,
    /** Starts over with a room's full state (login, doors, teleports). */
    reset({ players, npcs }: { players: FullCharacterWire[]; npcs: FullCharacterWire[] }) {
      characters.clear();
      for (const p of players) add(p, "player");
      for (const n of npcs) add(n, "npc");
    },
    add,
    remove(id: string) {
      characters.delete(id);
    },
    applyPoses(data: ArrayBuffer) {
      const poses = decodeRoomPoses(data, (nid) => idsByNetId.get(nid));
      for (const [id, x, y] of [...poses.p, ...poses.n]) {
        const seen = characters.get(id);
        if (seen) Object.assign(seen, { x, y });
      }
    },
    markDead(id: string) {
      const seen = characters.get(id);
      if (seen) seen.isDead = true;
    },
    markAlive(id: string, x: number, y: number) {
      const seen = characters.get(id);
      if (seen) Object.assign(seen, { x, y, isDead: false });
    },
    /** Live NPCs, nearest to a point first. */
    npcsNear(x: number, y: number, name?: string) {
      return [...characters.values()]
        .filter(
          (c) =>
            c.kind === "npc" && !c.isDead && (!name || c.name.toLowerCase() === name.toLowerCase()),
        )
        .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
    },
  };
}
