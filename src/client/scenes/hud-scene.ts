import { addDodgeListeners } from "@/client/input/hero-dodge";
import Phaser from "phaser";
import type { ClientGameSocket } from "@/network";
import { addGlobalEventListeners } from "@/client/input/hero-events";
import { moveDirectHero } from "@/client/input/hero-movement";
import { addJoystick } from "@/client/input/hud-joystick";
import type { Joystick } from "@/client/input/joystick";

const { W, S, A, D } = Phaser.Input.Keyboard.KeyCodes;

export class SceneHud extends Phaser.Scene {
  socket: ClientGameSocket;
  cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys &
    Record<"w" | "s" | "a" | "d", Phaser.Input.Keyboard.Key>;
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
    const keyboard = this.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin;
    this.cursorKeys = keyboard.createCursorKeys() as typeof this.cursorKeys;
    this.cursorKeys.w = keyboard.addKey(W);
    this.cursorKeys.s = keyboard.addKey(S);
    this.cursorKeys.a = keyboard.addKey(A);
    this.cursorKeys.d = keyboard.addKey(D);
    keyboard.removeCapture("W,A,S,D,SPACE,up,down,left,right");
    this.input.addPointer();
  }
  create() {
    addJoystick(this);
    addGlobalEventListeners(this);
    addDodgeListeners(this);
  }
  update(_time: number, delta: number) {
    moveDirectHero(this, delta);
  }
}
