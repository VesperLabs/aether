import Phaser from "phaser";
import type { SceneHud } from "@/client/scenes/hud-scene";

export function addJoystick(scene: SceneHud) {
  const isTouch = scene.sys.game.device.input.touch;
  scene.joystick = scene.add.joystick({
    sprites: { cap: new RoundButton(scene), base: new RoundButton(scene) },
    singleDirection: false,
    maxDistanceInPixels: 50,
    device: isTouch ? 1 : 0, // 0 for mouse pointer (computer), 1, 2, 3 for touch pointers (mobile)
  });
  scene.joystick2 = scene.add.joystick({
    sprites: { cap: new RoundButton(scene), base: new RoundButton(scene) },
    singleDirection: false,
    maxDistanceInPixels: 50,
    device: 2, // 0 for mouse pointer (computer), 1, 2, 3 for touch pointers (mobile)
  });
}

class RoundButton extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, "joy-circle");
    this.displayWidth = 50;
    this.displayHeight = 50;
    this.alpha = 0.1;
    this.setTint(0xff0000);
    this.setScrollFactor(0);
  }
}
