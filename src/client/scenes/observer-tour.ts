import { mapList } from "@/content";
import type { Point } from "@/rules/world";
import type { RoomStateMessage } from "@/network";
import { getGameZoomLevel } from "./camera-zoom";
import { zoomToCover } from "./cover-zoom";
import { enterRoom, whenRoomLoaded } from "./enter-room";
import type { SceneMain } from "./main-scene";
import { getNpcs, getPlayers } from "./scene-entities";
import { hideWorld, revealWorldWhenSettled } from "./world-reveal";

/** How long the camera drifts through a room before teleporting to the next. */
const PAN_MS = 16000;
const FADE_MS = 700;

/* Interiors are too small to scroll through */
const TOUR_ROOMS = mapList.map((map) => map.name).filter((name) => !name.includes("Inside"));

const pickFrom = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];

function visitNextRoom(scene: SceneMain) {
  if (!scene.socket.connected) return;
  const rooms = TOUR_ROOMS.filter((name) => name !== scene.roomName);
  scene.socket.emit("observe", { roomName: pickFrom(rooms) });
}

/** Somewhere worth looking at: the players first, then the npcs, then anywhere on the map. */
function pickSight(scene: SceneMain, not?: Point): Point {
  const players = getPlayers(scene).filter((c) => c !== not);
  const npcs = getNpcs(scene).filter((c) => c !== not);
  const sights = players.length ? players : npcs;
  if (sights.length) return pickFrom(sights);
  return {
    x: Math.random() * scene.map.widthInPixels,
    y: Math.random() * scene.map.heightInPixels,
  };
}

/** Zooms in past the game's limit if need be: the tour must never show the edge of the map. */
export function fitTourCamera(scene: SceneMain) {
  const { map, cameras } = scene;
  if (!map) return;
  const { width, height } = cameras.main;
  const mapSize = { width: map.widthInPixels, height: map.heightInPixels };
  cameras.main.setZoom(zoomToCover({ width, height }, mapSize, getGameZoomLevel(scene)));
  cameras.main.setBounds(0, 0, mapSize.width, mapSize.height);
}

function panThroughRoom(scene: SceneMain) {
  const camera = scene.cameras.main;
  const from = pickSight(scene);
  const to = pickSight(scene, from);
  const onFaded = (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
    if (progress === 1) visitNextRoom(scene);
  };
  camera.resetFX();
  camera.stopFollow();
  fitTourCamera(scene);
  camera.centerOn(from.x, from.y);
  camera.pan(to.x, to.y, PAN_MS, "Sine.easeInOut", true, (_camera, progress) => {
    if (progress === 1) camera.fadeOut(FADE_MS, 0, 0, 0, onFaded);
  });
}

export function onRoomObserved(scene: SceneMain, message: RoomStateMessage & { roomName: string }) {
  whenRoomLoaded(scene, message.roomName, () => {
    /* Logged in while the room's art loaded: the hero's room has replaced it */
    if (scene.hero) return;
    showObservedRoom(scene, message);
  });
}

function showObservedRoom(
  scene: SceneMain,
  { roomName, ...room }: RoomStateMessage & { roomName: string },
) {
  const isFirstRoom = scene.isTourHidden;
  if (isFirstRoom) hideWorld(scene);
  scene.minimap?.setVisible(false);
  enterRoom(scene, roomName, room);
  panThroughRoom(scene);
  if (isFirstRoom) {
    scene.isTourHidden = false;
    revealWorldWhenSettled(scene);
  } else {
    scene.cameras.main.fadeIn(FADE_MS);
  }
}

/** Tours the rooms behind the login screen, from every connection until it logs in. */
export function startObserverTour(scene: SceneMain) {
  scene.isTourHidden = true;
  visitNextRoom(scene);
}

/** Stops the pan and fades, so the camera is free to follow the hero. */
export function stopObserverTour(scene: SceneMain) {
  scene.cameras.main.resetFX();
}
