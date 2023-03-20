import Phaser from "phaser";
import { isMobile, getSpinDirection } from "./utils";
class SceneHud extends Phaser.Scene {
  constructor(socket) {
    super({
      key: "SceneHud",
    });
    this.socket = socket;
  }
  preload() {}
  create() {
    addJoystick(this);
    addInputListeners(this);
  }
  update() {}
}

function addInputListeners(scene) {
  const pointer = scene.input.activePointer;
  const mainScene = scene.scene.manager.getScene("SceneMain");
  /* Keyboard */
  scene.input.keyboard.on("keyup-SPACE", (e) => {
    if (document.activeElement.type === "text") return;
    mainScene?.hero?.doAttack?.(1);
  });
  window.addEventListener(
    "HERO_ATTACK",
    (e) => {
      mainScene?.hero?.doAttack?.(1);
    },
    scene
  );
  window.addEventListener(
    "HERO_GRAB",
    (e) => {
      mainScene?.hero?.doGrab?.();
    },
    scene
  );
  window.addEventListener(
    "ITEM_DRAG",
    (e) => {
      pointer.x = e?.detail.x;
      pointer.y = e?.detail.y;
      const cursorPoint = pointer.positionToCamera(mainScene.cameras.main);
      const direction = getSpinDirection(mainScene?.hero, cursorPoint);
      if (mainScene?.hero?.direction !== direction) {
        scene.socket.emit("changeDirection", direction);
      }
    },
    scene
  );
}

function addJoystick(scene) {
  scene.joystick = scene.add.joystick({
    sprites: { cap: new RoundButton(scene), base: new RoundButton(scene) },
    singleDirection: false,
    maxDistanceInPixels: 25,
    device: isMobile ? 1 : 0, // 0 for mouse pointer (computer), 1 for touch pointer (mobile)
  });
}

class RoundButton extends Phaser.GameObjects.Sprite {
  constructor(scene) {
    super(scene, 0, 0, "joy-circle");
    this.displayWidth = 50;
    this.displayHeight = 50;
    this.alpha = 0.1;
    this.setTint(0xff0000);
    this.setScrollFactor(0);
  }
}

export default SceneHud;
