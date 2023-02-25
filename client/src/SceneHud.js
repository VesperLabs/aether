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
    this.input.keyboard.on("keyup-SPACE", (e) => {
      const mainScene = this.scene.manager.getScene("SceneMain");
      if (document.activeElement.type === "text") return;
      if (!mainScene.hero) return;
      mainScene.hero.doAttack("attack_right");
    });
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
