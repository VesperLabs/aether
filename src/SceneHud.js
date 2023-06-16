import Phaser from "phaser";
import { playAudio, getSpinDirection } from "./utils";
const { W, S, A, D } = Phaser.Input.Keyboard.KeyCodes;
const { Between } = Phaser.Math.Angle;

class SceneHud extends Phaser.Scene {
  constructor(socket) {
    super({
      key: "SceneHud",
    });
    this.socket = socket;
    this.stickActive = false;
  }
  preload() {
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    this.cursorKeys.w = this.input.keyboard.addKey(W);
    this.cursorKeys.s = this.input.keyboard.addKey(S);
    this.cursorKeys.a = this.input.keyboard.addKey(A);
    this.cursorKeys.d = this.input.keyboard.addKey(D);
    this.input.keyboard.removeCapture("W,A,S,D,SPACE,up,down,left,right");
  }
  create() {
    addJoystick(this);
    addGlobalEventListeners(this);
  }
  update(time, delta) {
    moveHero(this, time);
  }
}

function addGlobalEventListeners(scene) {
  const isTouch = scene.sys.game.device.input.touch;
  const pointer = scene.input.activePointer;
  const mainScene = scene.scene.manager.getScene("SceneMain");
  const socket = scene.socket;

  /* Disable context menu on canvas */
  document.getElementById("game").addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });
  /* Desktop left click attack */
  document.getElementById("game").addEventListener("mousedown", function (event) {
    if (!isTouch && event.button !== 0) {
      window.dispatchEvent(new CustomEvent("HERO_ATTACK_START"));
    }
  });
  /* Desktop left click attack */
  document.getElementById("game").addEventListener("mouseup", function (event) {
    if (!isTouch && event.button !== 0) {
      window.dispatchEvent(new CustomEvent("HERO_ATTACK"));
    }
  });
  window.addEventListener(
    "HERO_ATTACK_START",
    (e) => {
      if (e?.detail?.skipAiming) return;
      mainScene.hero.state.isAiming = true;
    },
    scene
  );
  window.addEventListener(
    "HERO_ATTACK",
    (e) => {
      mainScene.hero.state.isAiming = false;
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

      if (ability?.type === "spell") {
        mainScene?.hero?.castSpell?.({
          ilvl: ability?.ilvl,
          abilitySlot: e?.detail,
          spellName: ability?.base,
          castAngle: hero?.state?.lastAngle,
        });
        mainScene.hero.state.isAiming = false;
      }
      if (ability?.type === "stackable") {
        socket.emit("consumeItem", { item: ability, location: "abilities" });
        window.dispatchEvent(
          new CustomEvent("AUDIO_ITEM_CONSUME", {
            detail: item,
          })
        );
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
    "AUDIO_ITEM_CONSUME",
    (e) => {
      const hero = mainScene?.hero;
      playAudio({ scene: mainScene, audioKey: "item-bubble", caster: hero });
    },
    scene
  );
  window.addEventListener(
    "AUDIO_ITEM_SELL",
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

function isTypableFieldActive() {
  const typableTags = ["INPUT", "TEXTAREA", "SELECT", "A"];
  const activeElement = document.activeElement;

  if (activeElement && typableTags.includes(activeElement.tagName)) {
    return true;
  }

  return false;
}

function moveHero(scene, time) {
  const isTouch = scene.sys.game.device.input.touch;
  const pointer = scene.input.activePointer;
  const mainScene = scene.scene.manager.getScene("SceneMain");
  const hero = mainScene?.hero;
  let vx = 0;
  let vy = 0;
  let direction = hero?.direction;

  if (!hero) return;
  /* If the user is dead or typing stop them from moving */
  if (hero?.state?.isDead || isTypableFieldActive()) {
    hero.vx = 0;
    hero.vy = 0;
    hero.body.setVelocity(0, 0);
    return;
  }

  const walkSpeed = hero.stats.walkSpeed;
  const joystick = scene.game.scene.scenes[2].joystick;

  const up = scene.cursorKeys.w.isDown || scene.cursorKeys.up.isDown;
  const left = scene.cursorKeys.a.isDown || scene.cursorKeys.left.isDown;
  const down = scene.cursorKeys.s.isDown || scene.cursorKeys.down.isDown;
  const right = scene.cursorKeys.d.isDown || scene.cursorKeys.right.isDown;

  if (left) {
    vx = -walkSpeed;
    direction = "left";
  }
  if (right) {
    vx = walkSpeed;
    direction = "right";
  }
  if (up) {
    vy = -walkSpeed;
    direction = "up";
  }
  if (down) {
    vy = walkSpeed;
    direction = "down";
  }
  if (left && right) vx = 0;
  if (up && down) vy = 0;
  if (!left && !right && !up && !down) {
    vx = 0;
    vy = 0;
  }

  if (joystick.deltaX || joystick.deltaY) {
    vx = joystick.deltaX * walkSpeed;
    vy = joystick.deltaY * walkSpeed;
    direction = getSpinDirection(hero, { x: hero.x + vx, y: hero.y + vy });
    /* Latest idle check, we set the lastAngle so it's fresh */
    hero.state.lastAngle = Math.atan2(joystick.deltaY, joystick.deltaX);
  }

  /* Spin hero when charging */
  if (hero?.state.isAiming) {
    if (!isTouch) {
      const cursorPoint = pointer.positionToCamera(mainScene.cameras.main);
      direction = getSpinDirection(mainScene?.hero, cursorPoint);
      hero.state.lastAngle = Between(hero.x, hero.y, cursorPoint.x, cursorPoint.y);
    }
    if (mainScene?.hero?.direction !== direction) {
      scene.socket.emit("changeDirection", direction);
    }
  }

  if (hero.state.isAttacking || hero?.state.isAiming) {
    vx = 0;
    vy = 0;
  }

  hero.vx = vx;
  hero.vy = vy;
  if (!hero.state.isAttacking) hero.direction = direction;

  hero.body.setVelocity(vx, vy);

  /* If the hero is standing still do not update the server */
  if (!hero.state.isIdle) {
    //if (time % 2 > 1)
    scene.socket.emit("playerInput", {
      vx,
      vy,
      x: hero.x,
      y: hero.y,
      direction: hero.direction,
    });
  }
  hero.state.isIdle = hero.vx === vx && hero.vy === vy && vx === 0 && vy === 0;
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
