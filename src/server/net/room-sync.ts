import type { ServerWorld } from "../server-world";
import {
  getBuffRoomState as packBuffRoomState,
  getPublicRoomState as packPublicRoomState,
  getRoomEffects,
  getRoomState as packRoomState,
} from "@/network/sync";
import { hourAt, seasonAt } from "@/rules/seasons";
import { weatherAt } from "@/rules/weather";

/* Thin world adapters: hand the world's collections to the pure packers in network/sync. */

/** What is in flight in a room: spells flying on their own. */
function roomEffects(world: ServerWorld, roomName: string) {
  return getRoomEffects(Object.values(world.spells), roomName, world.now());
}

/** A room as `viewer` (a socket id) sees it on joining: its own character whole. */
export function getRoomState(world: ServerWorld, roomName: string, viewer: string) {
  return {
    ...packRoomState(world, roomName, viewer),
    effects: roomEffects(world, roomName),
    season: seasonAt(world.now(), world.calendar),
    hour: hourAt(world.now(), world.calendar),
    weather: weatherAt(world.now(), world.weather, seasonAt(world.now(), world.calendar)),
    now: world.now(),
  };
}

/** A room as anonymous observers see it. */
export function getPublicRoomState(world: ServerWorld, roomName: string) {
  return {
    ...packPublicRoomState(world, roomName),
    effects: roomEffects(world, roomName),
    season: seasonAt(world.now(), world.calendar),
    hour: hourAt(world.now(), world.calendar),
    weather: weatherAt(world.now(), world.weather, seasonAt(world.now(), world.calendar)),
    now: world.now(),
  };
}

/** Takes any players and npcs, such as just one room's, so it need not scan the whole world. */
export function getBuffRoomState(world: Pick<ServerWorld, "players" | "npcs">, roomName: string) {
  return packBuffRoomState(world, roomName);
}
