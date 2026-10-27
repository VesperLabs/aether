import {
  getBuffCharacterState,
  getFullCharacterState,
  getLootTickWire,
  getTickCharacterState,
  type BuffCharacterWire,
  type CharacterSyncInput,
  type FullCharacterWire,
  type LootTickWire,
  type TickCharacterWire,
} from "./character-state";

/** Everything alive in the game, as plain collections keyed by id. Room functions pick one room out of it. */
export interface RoomSyncInput<C, L> {
  players: Readonly<Record<string, C>>;
  npcs: Readonly<Record<string, C>>;
  loots: Readonly<Record<string, L>>;
}

type InRoom = { room?: { name?: string } | null };
type BuffFlagged = InRoom & { state?: { hasBuffChanges?: unknown } };
type LootInRoom = { roomName?: string };

/** Everything in a room, for the first message a client gets (heroInit) or a late join. */
export function getRoomState<L extends LootInRoom>(
  world: RoomSyncInput<CharacterSyncInput, L>,
  roomName: string,
): { players: FullCharacterWire[]; npcs: FullCharacterWire[]; loots: L[] } {
  return {
    players: Object.values(world.players)
      ?.filter((p) => p?.room?.name === roomName)
      .map((p) => getFullCharacterState(p)),
    npcs: Object.values(world.npcs)
      ?.filter((n) => n?.room?.name === roomName)
      .map((p) => getFullCharacterState(p)),
    loots: Object.values(world.loots)?.filter((l) => l?.roomName === roomName),
  };
}

/** The room tick before it is compacted and diffed. */
export function getTickRoomState(
  world: RoomSyncInput<
    Parameters<typeof getTickCharacterState>[0] & InRoom,
    { id: string; expiredSince?: number | null } & LootInRoom
  >,
  roomName: string,
): { players: TickCharacterWire[]; npcs: TickCharacterWire[]; loots: LootTickWire[] } {
  return {
    players: Object.values(world.players)
      ?.filter((p) => p?.room?.name === roomName)
      .map(getTickCharacterState),
    npcs: Object.values(world.npcs)
      ?.filter((p) => p?.room?.name === roomName)
      .map(getTickCharacterState),
    loots: Object.values(world.loots)
      ?.filter((l) => l?.roomName === roomName)
      .map(getLootTickWire),
  };
}

/** Players and npcs in a room whose buffs changed since the last tick. Clears their change flag. */
export function getBuffRoomState(
  world: Pick<
    RoomSyncInput<Parameters<typeof getBuffCharacterState>[0] & BuffFlagged, never>,
    "players" | "npcs"
  >,
  roomName: string,
): { players: BuffCharacterWire[]; npcs: BuffCharacterWire[] } {
  return {
    players: Object.values(world.players)
      ?.filter((p) => p?.room?.name === roomName && p?.state?.hasBuffChanges)
      .map(getBuffCharacterState),
    npcs: Object.values(world.npcs)
      ?.filter((p) => p?.room?.name === roomName && p?.state?.hasBuffChanges)
      .map(getBuffCharacterState),
  };
}
