import { encodeWireDirection } from "@/network/sync";
import type { Player } from "@/client/views/player";
import type { SceneHud } from "@/client/scenes/hud-scene";

/** Max rate for playerInput while moving (server still gets full x,y,vx,vy snapshots). */
const PLAYER_INPUT_THROTTLE_MS = 50;

/** Sends the hero's movement to the server, throttled while the input is unchanged. */
export function emitPlayerInput(
  scene: SceneHud,
  hero: Player,
  vx: number,
  vy: number,
  direction: string,
) {
  /* If the hero is standing still do not update the server */
  if (hero.state.isIdle || hero.state.isEnteringDoor) return;
  if (!scene._playerInputNet) {
    scene._playerInputNet = { lastEmitAt: 0, lastEmitted: null };
  }
  const net = scene._playerInputNet;
  const d = encodeWireDirection(direction);
  const payload: {
    vx: number;
    vy: number;
    x: number;
    y: number;
    d: number;
    roomName?: string;
  } = {
    vx: Math.round(vx),
    vy: Math.round(vy),
    x: Math.round(hero.x),
    y: Math.round(hero.y),
    d,
  };
  if (!net.lastEmitted || net.lastEmitted.roomName !== hero.roomName) {
    payload.roomName = hero.roomName;
  }
  const now = Date.now();
  const stopped = vx === 0 && vy === 0;
  const wasMoving = net.lastEmitted && (net.lastEmitted.vx !== 0 || net.lastEmitted.vy !== 0);
  const flushNow =
    !net.lastEmitted ||
    (stopped && wasMoving) ||
    (net.lastEmitted && (net.lastEmitted.d !== d || net.lastEmitted.roomName !== hero.roomName)) ||
    now - net.lastEmitAt >= PLAYER_INPUT_THROTTLE_MS;

  if (flushNow) {
    scene.socket.emit("playerInput", payload);
    net.lastEmitAt = now;
    net.lastEmitted = {
      vx: payload.vx,
      vy: payload.vy,
      x: payload.x,
      y: payload.y,
      d: payload.d,
      roomName: hero.roomName,
    };
  }
}
