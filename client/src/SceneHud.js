import Phaser from "phaser";
import { isMobile } from "./utils";
class SceneHud extends Phaser.Scene {
  constructor(socket) {
    super({
      key: "SceneHud",
    });
    this.socket = socket;
    this.isMobile = isMobile;
  }
  preload() {}
  create() {
    addJoystick(this);
  }
  update() {}
}

function addJoystick(scene) {
  scene.joystick = scene.add.joystick({
    sprites: {
      base: "",
      body: "",
      cap: "",
    },
    singleDirection: false,
    maxDistanceInPixels: 50,
    device: isMobile ? 1 : 0, // 0 for mouse pointer (computer), 1 for touch pointer (mobile)
  });
}

export default SceneHud;
