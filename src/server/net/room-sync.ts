import type { ServerWorld } from "../server-world";
import {
  getBuffRoomState as packBuffRoomState,
  getPublicRoomState as packPublicRoomState,
  getRoomEffects,
  getRoomState as packRoomState,
} from "@/network/sync";
import { hourAt, seasonAt } from "@/rules/seasons";

/* Thin world adapters: hand the world's collections to the pure packers in network/sync. */

/** What is in flight in a room: spells flying on their own, and thrown balls. */
function roomEffects(world: ServerWorld, roomName: string) {
  const sources = [...Object.values(world.spells), ...Object.values(world.balls)];
  return getRoomEffects(sources, roomName, world.now());
}

export function getRoomState(world: ServerWorld, roomName: string) {
  return {
    ...packRoomState(world, roomName),
    effects: roomEffects(world, roomName),
    season: seasonAt(world.now(), world.calendar),
    hour: hourAt(world.now(), world.calendar),
  };
}

/** A room as anonymous observers see it. */
export function getPublicRoomState(world: ServerWorld, roomName: string) {
  return {
    ...packPublicRoomState(world, roomName),
    effects: roomEffects(world, roomName),
    season: seasonAt(world.now(), world.calendar),
    hour: hourAt(world.now(), world.calendar),
  };
}

export function getBuffRoomState(world: ServerWorld, roomName: string) {
  return packBuffRoomState(world, roomName);
}
