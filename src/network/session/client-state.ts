import type { ChatMessage, LootMessage, ServerToClientEvents } from "@/network/messages";
import type { FullCharacterWire } from "@/network/sync/character-state";
import { decodeRoomPoses, type Pose } from "@/network/sync/poses";
import type { CharacterStatus, RoomStatuses } from "@/network/sync/statuses";
import { decodeTickVitals, type Vitals } from "@/network/sync/vitals";

/*
 * A client state: plain state of what a logged-in player sees, built only from server→client messages.
 * The real client keeps this in Phaser objects; headless players (bots) keep it here.
 */

/** A character as the client state holds it: its last whole data, moved by poses and statuses. */
export interface ClientCharacter extends FullCharacterWire {
  /** Hp, mp, sp and their maximums from the latest status, once one has arrived. */
  vitals?: Vitals;
  /** Server time of the last teleport or respawn; poses older than it are not interpolated. */
  lastTeleport?: number;
}

export interface ClientState {
  /** The hero's character id, from `heroInit`. Empty before login. */
  selfId: string;
  /** The room (map) the hero is in. */
  roomName: string;
  players: Map<string, ClientCharacter>;
  npcs: Map<string, ClientCharacter>;
  loots: Map<string, LootMessage>;
  /** Most recent chat and system messages, oldest first, at most `CHAT_LIMIT`. */
  chat: ChatMessage[];
  /** Server time of the latest poses applied, ms. */
  poseTime: number;
  /** Character ids by net id, to read binary poses. */
  idsByNetId: Map<number, string>;
}

export const CHAT_LIMIT = 50;

export function createClientState(): ClientState {
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
export function getSelf(clientState: ClientState): ClientCharacter | undefined {
  return clientState.players.get(clientState.selfId);
}

function remember(
  clientState: ClientState,
  list: Map<string, ClientCharacter>,
  c: FullCharacterWire,
) {
  const id = c.socketId || c.id;
  const old = list.get(id);
  list.set(id, { ...old, ...c });
  if (typeof c.nid === "number") clientState.idsByNetId.set(c.nid, id);
}

function forget(clientState: ClientState, list: Map<string, ClientCharacter>, id: string) {
  const c = list.get(id);
  if (!c) return;
  list.delete(id);
  if (clientState.idsByNetId.get(c.nid) === id) clientState.idsByNetId.delete(c.nid);
}

/** Merges partial character data (buff changes, grabbed loot) into a known character. */
function merge(list: Map<string, ClientCharacter>, c: { id?: string; socketId?: string }) {
  const id = c.socketId || c.id;
  const old = id ? list.get(id) : undefined;
  if (id && old) list.set(id, { ...old, ...c } as ClientCharacter);
}

type Handler<K extends keyof ServerToClientEvents> = (
  clientState: ClientState,
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
  poses(clientState, data) {
    applyPoses(clientState, data);
  },
  statuses(clientState, statuses) {
    applyStatuses(clientState, statuses);
  },
  heroInit(clientState, state) {
    clientState.selfId = state.socketId;
    clientState.players.clear();
    clientState.npcs.clear();
    clientState.loots.clear();
    clientState.idsByNetId.clear();
    for (const p of state.players ?? []) remember(clientState, clientState.players, p);
    for (const n of state.npcs ?? []) remember(clientState, clientState.npcs, n);
    for (const l of state.loots ?? []) if (!l.expiredSince) clientState.loots.set(l.id, l);
    clientState.roomName = getSelf(clientState)?.roomName ?? "";
  },
  playerJoin(clientState, player, { lastTeleport } = {}) {
    remember(clientState, clientState.players, player);
    const c = clientState.players.get(player.socketId || player.id);
    if (c && lastTeleport !== undefined) c.lastTeleport = lastTeleport;
  },
  playerUpdate(clientState, player) {
    if (clientState.players.has(player.socketId))
      remember(clientState, clientState.players, player);
  },
  remove(clientState, id) {
    forget(clientState, clientState.players, id);
  },
  buffUpdate(clientState, { players = [], npcs = [] } = {}) {
    for (const p of players) merge(clientState.players, p);
    for (const n of npcs) merge(clientState.npcs, n);
  },
  positionCorrection(clientState, { x, y }) {
    const self = getSelf(clientState);
    if (self) Object.assign(self, { x, y });
  },
  npcJoin(clientState, npc) {
    if (!clientState.npcs.has(npc.id)) remember(clientState, clientState.npcs, npc);
  },
  npcRemove(clientState, id) {
    forget(clientState, clientState.npcs, id);
  },
  respawnNpc(clientState, { id, x, y, respawnTime }) {
    const npc = clientState.npcs.get(id);
    if (npc) Object.assign(npc, { x, y, lastTeleport: respawnTime });
  },
  lootSpawned(clientState, { loot, npcId }) {
    /* Like the client, loot dropped by an npc appears where the npc stands. */
    const npc = npcId ? clientState.npcs.get(npcId) : undefined;
    clientState.loots.set(loot.id, npc ? { ...loot, x: npc.x, y: npc.y } : loot);
  },
  lootExpired(clientState, id) {
    clientState.loots.delete(id);
  },
  lootGrabbed(clientState, { loot, player }) {
    clientState.loots.delete(loot?.id);
    merge(clientState.players, player);
  },
  message(clientState, message) {
    if (!message) return;
    clientState.chat.push(message);
    if (clientState.chat.length > CHAT_LIMIT)
      clientState.chat.splice(0, clientState.chat.length - CHAT_LIMIT);
  },
};

/** Applies one server→client message. Messages the client state does not track are ignored. */
export function applyMessage<K extends keyof ServerToClientEvents>(
  clientState: ClientState,
  name: K,
  ...args: Parameters<ServerToClientEvents[K]>
): void {
  const handle = (handlers as { [P in keyof ServerToClientEvents]?: Handler<P> })[name] as
    | Handler<K>
    | undefined;
  handle?.(clientState, ...args);
}

function applyPose(list: Map<string, ClientCharacter>, [id, x, y, vx, vy]: Pose) {
  const c = list.get(id);
  if (c) Object.assign(c, { x, y, vx, vy });
}

/** Applies a binary `poses` tick: moves every known character. Older ticks than the last are dropped. */
export function applyPoses(clientState: ClientState, data: ArrayBuffer | ArrayBufferView): void {
  const poses = decodeRoomPoses(data, (nid) => clientState.idsByNetId.get(nid));
  if (poses.t < clientState.poseTime) return;
  clientState.poseTime = poses.t;
  for (const pose of poses.p) applyPose(clientState.players, pose);
  for (const pose of poses.n) applyPose(clientState.npcs, pose);
}

function applyStatus(list: Map<string, ClientCharacter>, status: CharacterStatus) {
  const c = list.get(status.id);
  if (!c) return;
  c.state = { ...c.state, ...status.state };
  c.vitals = decodeTickVitals(status.v) ?? c.vitals;
}

/** Applies a `statuses` message: state flags and vitals of characters that changed. */
export function applyStatuses(clientState: ClientState, statuses: RoomStatuses): void {
  for (const s of statuses.p ?? []) applyStatus(clientState.players, s);
  for (const s of statuses.n ?? []) applyStatus(clientState.npcs, s);
}
