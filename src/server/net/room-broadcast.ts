import type { LootMessage, ServerToClientEvents } from "@/network";
import {
  getFullCharacterState,
  getPublicCharacterState,
  type CharacterSyncInput,
  type FullCharacterWire,
} from "@/network/sync";
import type { ServerWorld } from "../server-world";

type RoomOperator = ReturnType<ServerWorld["io"]["to"]>;
type PackCharacter = (character: CharacterSyncInput) => FullCharacterWire;
type BroadcastCharacter = CharacterSyncInput & { id: string };

/** The socket room of a room's observers. They are also in the room itself, for the world events. */
export const observersOf = (roomName: string) => `observers:${roomName}`;

/** Everyone with a character in a room: for anything not fit for anonymous observers. */
export const toRoomPlayers = (world: ServerWorld, roomName: string) =>
  world.io.to(roomName).except(observersOf(roomName));

/** Everyone logged in, in any room. */
export const toAllPlayers = (world: ServerWorld) =>
  world.io.except(Object.keys(world.rooms).map(observersOf));

/** Sends to a room, packing characters whole for its players and trimmed for its observers. */
function sendCharacters(
  world: ServerWorld,
  roomName: string,
  send: (to: RoomOperator, pack: PackCharacter) => void,
) {
  send(toRoomPlayers(world, roomName), getFullCharacterState);
  send(world.io.to(observersOf(roomName)), getPublicCharacterState);
}

export function broadcastPlayerUpdate(
  world: ServerWorld,
  player: BroadcastCharacter & { roomName?: string | null },
  meta?: Parameters<ServerToClientEvents["playerUpdate"]>[1],
) {
  if (!player.roomName) return;
  sendCharacters(world, player.roomName, (to, pack) => to.emit("playerUpdate", pack(player), meta));
}

/** Tells a room a player arrived, everyone but that player. */
export function broadcastPlayerJoin(
  world: ServerWorld,
  roomName: string,
  player: BroadcastCharacter,
  meta: Parameters<ServerToClientEvents["playerJoin"]>[1],
) {
  sendCharacters(world, roomName, (to, pack) =>
    to.except(player.id).emit("playerJoin", pack(player), meta),
  );
}

export function broadcastLootGrabbed(
  world: ServerWorld,
  roomName: string,
  player: BroadcastCharacter,
  loot: LootMessage,
) {
  sendCharacters(world, roomName, (to, pack) =>
    to.emit("lootGrabbed", { socketId: player.id, loot, player: pack(player) }),
  );
}

/** Whole characters after a level up, which changes far more than a tick's buffs. */
export function broadcastLeveled(
  world: ServerWorld,
  roomName: string,
  players: BroadcastCharacter[],
  playerIdsThatLeveled: string[],
) {
  sendCharacters(world, roomName, (to, pack) =>
    to.emit("buffUpdate", { players: players.map(pack), playerIdsThatLeveled }),
  );
}
