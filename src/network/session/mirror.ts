import type { ChatMessage, LootMessage, ServerToClientEvents } from "@/network/messages";
import type { FullCharacterWire } from "@/network/sync/character-state";
import { decodeRoomPoses, type Pose } from "@/network/sync/poses";
import type { CharacterStatus, RoomStatuses } from "@/network/sync/statuses";
import { decodeTickVitals, type Vitals } from "@/network/sync/vitals";

/*
 * A mirror: plain state of what a logged-in player sees, built only from server→client messages.
 * The real client keeps this in Phaser objects; headless players (bots) keep it here.
 */

/** A character as the mirror holds it: its last whole data, moved by poses and statuses. */
export interface MirrorCharacter extends FullCharacterWire {
  /** Hp, mp, sp and their maximums from the latest status, once one has arrived. */
  vitals?: Vitals;
  /** Server time of the last teleport or respawn; poses older than it are not interpolated. */
  lastTeleport?: number;
}

export interface Mirror {
  /** The hero's character id, from `heroInit`. Empty before login. */
  selfId: string;
  /** The room (map) the hero is in. */
  roomName: string;
  players: Map<string, MirrorCharacter>;
  npcs: Map<string, MirrorCharacter>;
  loots: Map<string, LootMessage>;
  /** Most recent chat and system messages, oldest first, at most `CHAT_LIMIT`. */
  chat: ChatMessage[];
  /** Server time of the latest poses applied, ms. */
  poseTime: number;
  /** Character ids by net id, to read binary poses. */
  idsByNetId: Map<number, string>;
}

export const CHAT_LIMIT = 50;

export function createMirror(): Mirror {
  return {
    selfId: "",
    roomName: "",
    players: new Map(),
    npcs: new Map(),
    loots: new Map(),
    chat: [],
    poseTime: 0,
    idsByNetId: new Map(),
  };
}

/** The hero, once `heroInit` has arrived. */
export function getSelf(mirror: Mirror): MirrorCharacter | undefined {
  return mirror.players.get(mirror.selfId);
}

function remember(mirror: Mirror, list: Map<string, MirrorCharacter>, c: FullCharacterWire) {
  const id = c.socketId || c.id;
  const old = list.get(id);
  list.set(id, { ...old, ...c });
  if (typeof c.nid === "number") mirror.idsByNetId.set(c.nid, id);
}

function forget(mirror: Mirror, list: Map<string, MirrorCharacter>, id: string) {
  const c = list.get(id);
  if (!c) return;
  list.delete(id);
  if (mirror.idsByNetId.get(c.nid) === id) mirror.idsByNetId.delete(c.nid);
}

/** Merges partial character data (buff changes, grabbed loot) into a known character. */
function merge(list: Map<string, MirrorCharacter>, c: { id?: string; socketId?: string }) {
  const id = c.socketId || c.id;
  const old = id ? list.get(id) : undefined;
  if (id && old) list.set(id, { ...old, ...c } as MirrorCharacter);
}

type Handler<K extends keyof ServerToClientEvents> = (
  mirror: Mirror,
  ...args: Parameters<ServerToClientEvents[K]>
) => void;

/*
 * Messages that carry no lasting state a player sees: auth forms, settings, video chat, and
 * one-shot effects (attacks, casts, windups, hits, knockback) that views play straight from the
 * socket. Listing one here is a decision: a new message must be handled or ignored, or tsc fails.
 */
const IGNORED_MESSAGES = [
  "formError",
  "formSuccess",
  "loginToken",
  "loginTokenRejected",
  "knockedBack",
  "keeperDataUpdate",
  "spellHitShapes",
  "playerAttack",
  "playerDodge",
  "playerCastSpell",
  "npcAttack",
  "npcWindup",
  "npcCastSpell",
  "modifyPlayerStat",
  "assignDamage",
  "partyInvite",
  "partyUpdate",
  "updateUserSetting",
  "connectPeer",
] as const satisfies readonly (keyof ServerToClientEvents)[];

type IgnoredMessage = (typeof IGNORED_MESSAGES)[number];

/** Every message is either handled here or in `IGNORED_MESSAGES`, never both. */
const handlers: { [K in Exclude<keyof ServerToClientEvents, IgnoredMessage>]: Handler<K> } & {
  [K in IgnoredMessage]?: never;
} = {
  poses(mirror, data) {
    applyPoses(mirror, data);
  },
  statuses(mirror, statuses) {
    applyStatuses(mirror, statuses);
  },
  heroInit(mirror, state) {
    mirror.selfId = state.socketId;
    mirror.players.clear();
    mirror.npcs.clear();
    mirror.loots.clear();
    mirror.idsByNetId.clear();
    for (const p of state.players ?? []) remember(mirror, mirror.players, p);
    for (const n of state.npcs ?? []) remember(mirror, mirror.npcs, n);
    for (const l of state.loots ?? []) if (!l.expiredSince) mirror.loots.set(l.id, l);
    mirror.roomName = getSelf(mirror)?.roomName ?? "";
  },
  playerJoin(mirror, player, { lastTeleport } = {}) {
    remember(mirror, mirror.players, player);
    const c = mirror.players.get(player.socketId || player.id);
    if (c && lastTeleport !== undefined) c.lastTeleport = lastTeleport;
  },
  playerUpdate(mirror, player) {
    if (mirror.players.has(player.socketId)) remember(mirror, mirror.players, player);
  },
  remove(mirror, id) {
    forget(mirror, mirror.players, id);
  },
  buffUpdate(mirror, { players = [], npcs = [] } = {}) {
    for (const p of players) merge(mirror.players, p);
    for (const n of npcs) merge(mirror.npcs, n);
  },
  positionCorrection(mirror, { x, y }) {
    const self = getSelf(mirror);
    if (self) Object.assign(self, { x, y });
  },
  npcJoin(mirror, npc) {
    if (!mirror.npcs.has(npc.id)) remember(mirror, mirror.npcs, npc);
  },
  npcRemove(mirror, id) {
    forget(mirror, mirror.npcs, id);
  },
  respawnNpc(mirror, { id, x, y, respawnTime }) {
    const npc = mirror.npcs.get(id);
    if (npc) Object.assign(npc, { x, y, lastTeleport: respawnTime });
  },
  lootSpawned(mirror, { loot, npcId }) {
    /* Like the client, loot dropped by an npc appears where the npc stands. */
    const npc = npcId ? mirror.npcs.get(npcId) : undefined;
    mirror.loots.set(loot.id, npc ? { ...loot, x: npc.x, y: npc.y } : loot);
  },
  lootExpired(mirror, id) {
    mirror.loots.delete(id);
  },
  lootGrabbed(mirror, { loot, player }) {
    mirror.loots.delete(loot?.id);
    merge(mirror.players, player);
  },
  message(mirror, message) {
    if (!message) return;
    mirror.chat.push(message);
    if (mirror.chat.length > CHAT_LIMIT) mirror.chat.splice(0, mirror.chat.length - CHAT_LIMIT);
  },
};

/** Applies one server→client message. Messages the mirror does not track are ignored. */
export function applyMessage<K extends keyof ServerToClientEvents>(
  mirror: Mirror,
  name: K,
  ...args: Parameters<ServerToClientEvents[K]>
): void {
  const handle = (handlers as { [P in keyof ServerToClientEvents]?: Handler<P> })[name] as
    | Handler<K>
    | undefined;
  handle?.(mirror, ...args);
}

function applyPose(list: Map<string, MirrorCharacter>, [id, x, y, vx, vy]: Pose) {
  const c = list.get(id);
  if (c) Object.assign(c, { x, y, vx, vy });
}

/** Applies a binary `poses` tick: moves every known character. Older ticks than the last are dropped. */
export function applyPoses(mirror: Mirror, data: ArrayBuffer | ArrayBufferView): void {
  const poses = decodeRoomPoses(data, (nid) => mirror.idsByNetId.get(nid));
  if (poses.t < mirror.poseTime) return;
  mirror.poseTime = poses.t;
  for (const pose of poses.p) applyPose(mirror.players, pose);
  for (const pose of poses.n) applyPose(mirror.npcs, pose);
}

function applyStatus(list: Map<string, MirrorCharacter>, status: CharacterStatus) {
  const c = list.get(status.id);
  if (!c) return;
  c.state = { ...c.state, ...status.state };
  c.vitals = decodeTickVitals(status.v) ?? c.vitals;
}

/** Applies a `statuses` message: state flags and vitals of characters that changed. */
export function applyStatuses(mirror: Mirror, statuses: RoomStatuses): void {
  for (const s of statuses.p ?? []) applyStatus(mirror.players, s);
  for (const s of statuses.n ?? []) applyStatus(mirror.npcs, s);
}
