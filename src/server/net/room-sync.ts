import type { ServerWorld } from "../server-world";
import {
  getBuffRoomState as packBuffRoomState,
  getRoomState as packRoomState,
} from "@/network/sync";

/* Thin world adapters: hand the world's collections to the pure packers in network/sync. */

export function getRoomState(world: ServerWorld, roomName: string) {
  return packRoomState(world, roomName);
}

export function getBuffRoomState(world: ServerWorld, roomName: string) {
  return packBuffRoomState(world, roomName);
}
