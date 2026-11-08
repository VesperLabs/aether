import { addDodgeListeners } from "@/client/input/hero-dodge";
import Phaser from "phaser";
import type { ClientGameSocket } from "@/network";
import { addGlobalEventListeners } from "@/client/input/hero-events";
import { trackHeldKeys } from "@/client/input/held-keys";
import { syncModalOpen } from "@/client/input/last-device";
import { moveDirectHero } from "@/client/input/hero-movement";
import { addJoystick } from "@/client/input/hud-joystick";
import type { Joystick } from "@/client/input/joystick";

export class SceneHud extends Phaser.Scene {
  socket: ClientGameSocket;
  rectangleContainer: unknown;
  /** Throttle state for `emitPlayerInput`. */
  _playerInputNet?: {
    lastEmitAt: number;
    lastEmitted: {
      vx: number;
      vy: number;
      x: number;
      y: number;
      d: number;
      roomName: string;
    } | null;
  };
  joystick!: Joystick;
  joystick2!: Joystick;
  constructor(socket: ClientGameSocket) {
    super({
      key: "SceneHud",
    });
    this.socket = socket;
  }
  preload() {
    trackHeldKeys();
    this.input.addPointer();
  }
  create() {
    addJoystick(this);
    addGlobalEventListeners(this);
    addDodgeListeners(this);
  }
  update(_time: number, delta: number) {
    syncModalOpen();
    moveDirectHero(this, delta);
  }
}
