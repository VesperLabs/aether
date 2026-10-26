import {
  getBuffRoomState as packBuffRoomState,
  getRoomState as packRoomState,
  getTickRoomState as packTickRoomState,
} from "@/shared/network/sync";

/* Thin scene adapters: hand the scene's collections to the pure packers in shared/network/sync. */

export function getRoomState(scene: ServerScene, roomName: string) {
  return packRoomState(scene, roomName);
}

export function getTickRoomState(scene: ServerScene, roomName: string) {
  return packTickRoomState(scene, roomName);
}

export function getBuffRoomState(scene: ServerScene, roomName: string) {
  return packBuffRoomState(scene, roomName);
}
