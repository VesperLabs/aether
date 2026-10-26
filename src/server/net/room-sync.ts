import {
  getBuffRoomState as packBuffRoomState,
  getRoomState as packRoomState,
  getTickRoomState as packTickRoomState,
} from "@/shared/network/sync";

/* Thin world adapters: hand the world's collections to the pure packers in shared/network/sync. */

export function getRoomState(world: ServerWorld, roomName: string) {
  return packRoomState(world, roomName);
}

export function getTickRoomState(world: ServerWorld, roomName: string) {
  return packTickRoomState(world, roomName);
}

export function getBuffRoomState(world: ServerWorld, roomName: string) {
  return packBuffRoomState(world, roomName);
}
