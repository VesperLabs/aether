import Phaser from "phaser";
import { playAudio, getSpinDirection } from "./utils";

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
    fadeIn(this);
  }
  update() {}
}

function fadeIn(scene) {
  const viewportWidth = scene.cameras.main.width;
  const viewportHeight = scene.cameras.main.height;
  // Create a black rectangle that covers the entire screen
  const graphics = scene.add.graphics();
  graphics.fillStyle(0x000000, 1);
  graphics.fillRect(0, 0, scene.cameras.main.width, scene.cameras.main.height);
  graphics.setDepth(100000);
  const dpanel = scene.add
    .text(viewportWidth / 2, viewportHeight / 2, "Loading... 100%", {
      font: "18px monospace",
      fill: "#ffffff",
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(100001);
  // Create a tween to gradually fade out the black rectangle
  scene.tweens.add({
    delay: 1000,
    targets: [graphics, dpanel],
    alpha: 0,
    duration: 500, // adjust the duration as desired
    onComplete: () => {
      // remove the black rectangle once the tween is complete
      graphics.destroy();
    },
  });
}

function addInputListeners(scene) {
  const isTouch = scene.sys.game.device.input.touch;
  const pointer = scene.input.activePointer;
  const mainScene = scene.scene.manager.getScene("SceneMain");

  window.addEventListener(
    "HERO_ATTACK",
    (e) => {
      mainScene?.hero?.doAttack?.(1);
    },
    scene
  );
  window.addEventListener(
    "HERO_ABILITY",
    (e) => {
      const hero = mainScene?.hero;
      const abilities = hero?.abilities;
      const ability = abilities?.[e?.detail];
      //const cursorPoint = pointer.positionToCamera(mainScene.cameras.main);

      if (ability?.type === "spell") {
        // Calculate the angle of the velocity
        // const castAngle = isTouch
        //   ? hero?.state?.lastAngle
        //   : Phaser.Math.Angle.Between(hero.x, hero.y, cursorPoint.x, cursorPoint.y);
        const castAngle = hero?.state?.lastAngle;
        mainScene?.hero?.castSpell?.({
          ilvl: ability?.ilvl,
          abilitySlot: e?.detail,
          spellName: ability?.base,
          castAngle,
        });
      }
    },
    scene
  );
  window.addEventListener(
    "HERO_GRAB",
    (e) => {
      const hero = mainScene?.hero;
      hero?.doGrab?.();
    },
    scene
  );
  window.addEventListener(
    "ITEM_SELL",
    (e) => {
      const hero = mainScene?.hero;
      playAudio({ scene: mainScene, audioKey: "item-sell", caster: hero });
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
  const isTouch = scene.sys.game.device.input.touch;
  scene.joystick = scene.add.joystick({
    sprites: { cap: new RoundButton(scene), base: new RoundButton(scene) },
    singleDirection: false,
    maxDistanceInPixels: 50,
    device: isTouch ? 1 : 0, // 0 for mouse pointer (computer), 1 for touch pointer (mobile)
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
