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
    const mainScene = this.scene.manager.getScene("SceneMain");
    this.input.keyboard.on("keyup-SPACE", (e) => {
      if (document.activeElement.type === "text") return;
      mainScene?.hero?.doAttack?.(1);
    });
    window.addEventListener(
      "hero_attack",
      (e) => {
        mainScene?.hero?.doAttack?.(1);
      },
      false
    );
  }
  update() {}
}

function addJoystick(scene) {
  scene.joystick = scene.add.joystick({
    sprites: {
      base: "joy-circle",
      body: "joy-circle",
      cap: "joy-circle",
    },
    singleDirection: false,
    maxDistanceInPixels: 50,
    device: isMobile ? 1 : 0, // 0 for mouse pointer (computer), 1 for touch pointer (mobile)
  });
}

export default SceneHud;
