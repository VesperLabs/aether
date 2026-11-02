import { decodeRoomPoses, type ChatMessage, type FullCharacterWire } from "@/network";
import type { MessageName, MessagePayload } from "./link";

/** A character as an agent sees it: where it is and whether it is still up. */
export interface SeenCharacter {
  id: string;
  name: string;
  kind: "player" | "npc";
  /** A monster: fair game. Keepers and players are not. */
  isHostile: boolean;
  x: number;
  y: number;
  isDead: boolean;
  /** Its size, for working out who a swing would hit. Missing on old servers. */
  bodySize?: number;
  hitBoxSize?: { width: number; height: number };
}

type Handlers = { [M in MessageName]?: (payload: MessagePayload<M>) => void };

/**
 * What an agent knows, built only from the messages the server sends it, the way the browser
 * client learns the world. Plain data plus one handler per message; no IO, so it is easy to test.
 */
export function createSenses() {
  const characters = new Map<string, SeenCharacter>();
  const idsByNetId = new Map<number, string>();
  const senses = {
    /** This connection's id, set at login. */
    selfId: "",
    /** Everyone in the agent's party, itself included; their swings can't hurt each other. */
    partyIds: new Set<string>(),
    /** The agent's own character, as the server last sent it. */
    hero: undefined as FullCharacterWire | undefined,
    /** Where the agent is: from the server on teleports and corrections, from its own steps. */
    x: 0,
    y: 0,
    roomName: "",
    characters,
    /** Every `positionCorrection`: a move the server refused. */
    corrections: [] as { x: number; y: number }[],
    messages: [] as ChatMessage[],
    /** Whether the agent's own character is dead (until it respawns). */
    isDead: false,
    /** Experience awarded since login. */
    expGained: 0,

    /** Live NPCs, nearest first, optionally only those with this name. */
    npcsNear(name?: string) {
      return [...characters.values()]
        .filter((c) => c.kind === "npc" && !c.isDead)
        .filter((c) => !name || c.name.toLowerCase() === name.toLowerCase())
        .sort((a, b) => distance(a, senses) - distance(b, senses));
    },
  };

  function see(wire: FullCharacterWire, kind: SeenCharacter["kind"]) {
    const id = (kind === "player" ? wire.socketId : wire.id) as string;
    idsByNetId.set(wire.nid, id);
    characters.set(id, {
      id,
      name: wire.profile?.userName ?? id,
      kind,
      isHostile: kind === "npc" && wire.kind === "nasty",
      x: wire.x,
      y: wire.y,
      isDead: !!wire.state?.isDead,
      bodySize: wire.bodySize,
      hitBoxSize: wire.hitBoxSize,
    });
  }

  function update(id: string, change: Partial<SeenCharacter>) {
    const seen = characters.get(id);
    if (seen) Object.assign(seen, change);
  }

  const handlers: Handlers = {
    partyUpdate({ party }) {
      senses.partyIds = new Set(party?.members.map((m) => m.id));
    },
    heroInit(state) {
      senses.selfId = state.socketId;
      characters.clear();
      state.players.forEach((p) => see(p, "player"));
      state.npcs.forEach((n) => see(n, "npc"));
      const hero = state.players.find((p) => p.socketId === state.socketId);
      if (!hero) return;
      /* Login, doors and teleports all land here: take the new spot */
      Object.assign(senses, {
        hero,
        x: hero.x,
        y: hero.y,
        roomName: hero.roomName,
        isDead: !!hero.state?.isDead,
      });
    },
    playerJoin: (player) => see(player, "player"),
    playerUpdate(player) {
      /* Its position can trail a walking agent, so only the rest is taken */
      if (player.socketId === senses.selfId) senses.hero = player;
    },
    remove: (socketId) => characters.delete(socketId),
    npcJoin: (npc) => see(npc, "npc"),
    npcRemove: (id) => characters.delete(id),
    respawnNpc: ({ id, x, y }) => update(id, { x, y, isDead: false }),
    poses(data) {
      const poses = decodeRoomPoses(data, (nid) => idsByNetId.get(nid));
      for (const [id, x, y] of [...poses.p, ...poses.n]) update(id, { x, y });
    },
    positionCorrection(position) {
      senses.corrections.push(position);
      Object.assign(senses, position);
    },
    assignDamage(hits) {
      for (const hit of hits) {
        if (hit.type === "death" && hit.to) update(hit.to, { isDead: true });
        if (hit.type === "death" && hit.to === senses.selfId) senses.isDead = true;
        if (hit.type === "exp" && hit.to === senses.selfId) senses.expGained += hit.amount ?? 0;
      }
    },
    message(message) {
      if (message) senses.messages.push(message);
    },
  };

  return { senses, handlers };
}

export type Senses = ReturnType<typeof createSenses>["senses"];

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
