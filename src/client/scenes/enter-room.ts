import type { RoomStateMessage } from "@/network";
import type { Player } from "@/client/views/player";
import { netInterp } from "@/client/net/scene-interpolation";
import { resetPoseArrivals } from "@/client/net/net-stats";
import { changeMap } from "./main-map";
import { showRoomSeason } from "./map-season";
import {
  prefetchBaseTilesets,
  prefetchSeason,
  roomTilesetKeys,
  whenTexturesLoaded,
} from "./tileset-textures";
import { announceSeason, setDayClock } from "./world-clock";
import type { SceneMain } from "./main-scene";
import { clearThrownBalls } from "@/client/views/thrown-ball";
import { startEffect } from "@/client/net/effects";
import {
  addLoot,
  addNpc,
  addPlayer,
  getLoot,
  getNpc,
  getPlayer,
  resetEntities,
} from "./scene-entities";

/** Rebuilds the scene as a room, with `heroSocketId`'s player as the hero, or none when observing. */
export function enterRoom(
  scene: SceneMain,
  roomName: string,
  { players = [], npcs = [], loots = [], effects = [], season, hour }: Partial<RoomStateMessage>,
  heroSocketId?: string,
) {
  clearThrownBalls();
  resetEntities(scene);
  scene.hero = undefined as unknown as Player;
  netInterp.reset();
  resetPoseArrivals();
  for (const player of players) {
    if (getPlayer(scene, player.socketId)) continue;
    const isHero = heroSocketId === player.socketId;
    const sprite = addPlayer(scene, { ...player, isHero });
    if (isHero) scene.hero = sprite;
  }
  for (const npc of npcs) {
    if (!getNpc(scene, npc.id)) addNpc(scene, npc);
  }
  for (const loot of loots) {
    if (!loot?.expiredSince && !getLoot(scene, loot.id)) addLoot(scene, loot);
  }
  /* What is already in flight, from where it has got to */
  for (const effect of effects) startEffect(scene, effect);
  if (season) {
    scene.season = season;
    announceSeason(season);
  }
  if (hour !== undefined) setDayClock(hour);
  const built = changeMap(scene, roomName);
  showRoomSeason(scene);
  /* The rest of the art, behind this room's: by the next door it has usually all arrived */
  prefetchBaseTilesets(scene);
  prefetchSeason(scene, scene.season);
  return built;
}

/**
 * Runs `enter` once the room's tilesets have loaded: at once after the first few rooms, but boot
 * loads no tileset art, so the very first room waits for its own.
 */
export function whenRoomLoaded(scene: SceneMain, roomName: string, enter: () => void) {
  whenTexturesLoaded(scene, roomTilesetKeys(scene, roomName), enter);
}
