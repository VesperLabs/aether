import Phaser from "phaser";
import type { ClientGameSocket } from "@/shared/network";
import { addGlobalEventListeners } from "@/client/input/hero-events";
import { moveDirectHero } from "@/client/input/hero-movement";
import { addJoystick } from "@/client/input/hud-joystick";

const { W, S, A, D } = Phaser.Input.Keyboard.KeyCodes;

export class SceneHud extends Phaser.Scene {
  socket: ClientGameSocket;
  cursorKeys: any;
  rectangleContainer: any;
  constructor(socket) {
    super({
      key: "SceneHud",
    });
    this.socket = socket;
  }
  preload() {
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    this.cursorKeys.w = this.input.keyboard.addKey(W);
    this.cursorKeys.s = this.input.keyboard.addKey(S);
    this.cursorKeys.a = this.input.keyboard.addKey(A);
    this.cursorKeys.d = this.input.keyboard.addKey(D);
    this.input.keyboard.removeCapture("W,A,S,D,SPACE,up,down,left,right");
    this.input.addPointer();
  }
  create() {
    addJoystick(this);
    addGlobalEventListeners(this);
  }
  update() {
    moveDirectHero(this);
  }
}
