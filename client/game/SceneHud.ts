import Phaser from "phaser";
import { playAudio, getSpinDirection } from "../utils";
import {
  spellDetails,
  POTION_COOLDOWN,
  getAngleFromDirection,
  CONSUMABLES_BASES,
  POTION_BASES,
} from "@aether/shared";
import { Socket } from "socket.io";
const { W, S, A, D } = Phaser.Input.Keyboard.KeyCodes;
const { Between } = Phaser.Math.Angle;

class SceneHud extends Phaser.Scene {
  socket: Socket;
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
  update(time, delta) {
    moveDirectHero(this, time);
  }
}

function addGlobalEventListeners(scene) {
  const isTouch = scene.sys.game.device.input.touch;
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
    if (!mainScene?.hero) return;
    const hero = mainScene?.hero;
    if (!isTouch && event.button !== 0) {
      const pointer = scene.input.activePointer;
      const cursorPoint = pointer.positionToCamera(mainScene.cameras.main);
      hero.direction = getSpinDirection(hero, cursorPoint);
      window.dispatchEvent(new CustomEvent("HERO_ATTACK"));
    }
  });
  window.addEventListener(
    "HERO_AIM_START",
    (e: CustomEvent) => {
      if (!mainScene?.hero || isTypableFieldActive()) return;
      const hero = mainScene?.hero;
      const { details } = hero.getAbilityDetails(e?.detail);

      if (details?.isAimable) {
        hero.state.isAiming = true;
        document.getElementById("game").style.cursor = "none";
        scene.socket.emit("updateState", { isAiming: hero.state.isAiming });
      }
    },
    scene
  );
  window.addEventListener(
    "HERO_ATTACK",
    (e) => {
      if (!mainScene?.hero) return;
      const hero = mainScene?.hero;
      document.getElementById("game").style.cursor = "default";
      if (hero.hasRangedWeapon()) {
        updateAttackCooldown(hero);
        hero?.doAttack?.({ count: 1, castAngle: hero.state.lastAngle, direction: hero.direction });
      }
      // update the state optimistically
      hero.state.isAiming = false;
      hero.state.isHoldingAttack = false;
      scene.socket.emit("updateState", {
        isAiming: hero.state.isAiming,
        isHoldingAttack: hero.state.isHoldingAttack,
      });
    },
    scene
  );
  window.addEventListener(
    "HERO_ATTACK_START",
    (e) => {
      if (!mainScene?.hero) return;
      const hero = mainScene?.hero;
      hero.state.isHoldingAttack = true;
      if (hero.hasRangedWeapon()) {
        hero.state.isAiming = true;
        document.getElementById("game").style.cursor = "none";
      }
      scene.socket.emit("updateState", {
        isAiming: hero.state.isAiming,
        isHoldingAttack: hero.state.isHoldingAttack,
      });
    },
    scene
  );
  window.addEventListener(
    "HERO_ABILITY",
    (e: CustomEvent) => {
      const hero = mainScene?.hero;
      const abilitySlot = e?.detail;
      const { ability, spellName } = hero.getAbilityDetails(abilitySlot);

      if (ability?.type === "spell") {
        /* Tell the UI to update the cooldown */
        updateSpellCooldown(hero, abilitySlot);

        hero?.doCast?.({
          ilvl: ability?.ilvl,
          abilitySlot,
          spellName,
          castAngle: hero?.state?.lastAngle,
        });

        hero.state.isAiming = false;
        scene.socket.emit("updateState", { isAiming: hero.state.isAiming });
        document.getElementById("game").style.cursor = "default";
      }
    },
    scene
  );
  /* TODO: Move to server and create a consumeItemFunction */
  window.addEventListener("HERO_USE_ITEM", (e: CustomEvent) => {
    const hero = mainScene?.hero;
    const { item, location } = e?.detail ?? {};

    if (!hero.checkCastReady()) return;

    /* If it is food we are trying to consume it */
    if (CONSUMABLES_BASES?.includes(item?.base)) {
      /* Tell the UI to update the cooldowns */
      if (item.base === "food") {
        updateSpellCooldown(hero, e?.detail);
      }
      if (POTION_BASES.includes(item.base)) {
        if (hero.state.isPotioning) return; /* TODO: Needs to happen serverside */
        updatePotionCooldown(hero);
      }
    }

    socket.emit("consumeItem", { item, location });

    window.dispatchEvent(
      new CustomEvent("AUDIO_ITEM_CONSUME", {
        detail: item,
      })
    );
  });
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
    (e: CustomEvent) => {
      const hero = mainScene?.hero;
      const pointer = scene.input.activePointer;
      pointer.x = e?.detail.x;
      pointer.y = e?.detail.y;
      const cursorPoint = pointer.positionToCamera(mainScene.cameras.main);
      const direction = getSpinDirection({ x: hero.x, y: hero.y + hero.bodyOffsetY }, cursorPoint);

      if (hero?.direction !== direction) {
        hero.direction = direction;
        scene.socket.emit("changeDirection", { direction });
      }
    },
    scene
  );
}

function updateAttackCooldown(hero) {
  if (hero.state.isAttacking) return;
  const attackDelay = hero?.getFullAttackDelay();
  const duration = attackDelay;
  window.dispatchEvent(
    new CustomEvent("HERO_START_COOLDOWN", {
      detail: { spellName: "attack", duration: duration, startTime: Date.now() },
    })
  );
}

function updatePotionCooldown(hero) {
  if (hero.state.isPotioning) return;
  hero.state.lastPotion = Date.now();
  window.dispatchEvent(
    new CustomEvent("HERO_START_COOLDOWN", {
      detail: {
        spellName: "potion",
        duration: POTION_COOLDOWN,
        startTime: Date.now(),
      },
    })
  );
}

function updateSpellCooldown(hero, abilitySlot) {
  if (!hero.canCastSpell(abilitySlot)) return;
  const castDelay = hero?.stats?.castDelay;
  const ability = hero?.abilities?.[abilitySlot];
  const spellName = ability?.base;
  const baseCooldown = spellDetails?.[spellName]?.baseCooldown ?? 0;
  window.dispatchEvent(
    new CustomEvent("HERO_START_COOLDOWN", {
      detail: {
        spellName,
        duration: castDelay + baseCooldown,
        sharedDuration: castDelay,
        startTime: Date.now(),
      },
    })
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

function moveDirectHero(scene, time) {
  const isTouch = scene.sys.game.device.input.touch;
  const pointer = scene.input.activePointer;
  const mainScene = scene.scene.manager.getScene("SceneMain");
  const hero = mainScene?.hero;
  let lastAngle = hero?.state?.lastAngle;
  let vx = 0;
  let vy = 0;
  let direction = hero?.direction;
  if (!hero) return;
  /* If the user is dead or typing stop them from moving */
  if (hero?.state?.isDead || isTypableFieldActive() || hero?.hasBuff("stun")) {
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

  /* Keeps bows facing the right direction if you try to spin out of an attack */
  if (hero.state.isAttacking && (vx || vy)) {
    lastAngle = Phaser.Math.DegToRad(getAngleFromDirection(direction));
  }

  if (joystick.deltaX || joystick.deltaY) {
    vx = joystick.deltaX * walkSpeed;
    vy = joystick.deltaY * walkSpeed;
    direction = getSpinDirection(hero, { x: hero.x + vx, y: hero.y + vy });
    /* Latest idle check, we set the lastAngle so it's fresh */
    lastAngle = Math.atan2(joystick.deltaY, joystick.deltaX);
  }

  /* Spin hero when aiming */
  if (hero?.state.isAiming) {
    if (!isTouch) {
      const cursorPoint = pointer.positionToCamera(mainScene.cameras.main);
      direction = getSpinDirection({ x: hero.x, y: hero.y + hero.bodyOffsetY }, cursorPoint);
      lastAngle = Between(hero.x, hero.y + hero.bodyOffsetY, cursorPoint.x, cursorPoint.y);
    }
    if (hero?.state?.lastAngle !== lastAngle) {
      //TODO only send this if the difference is greater than 10 or something
      scene.socket.emit("changeDirection", { direction, lastAngle });
    }
  }

  hero.state.lastAngle = lastAngle;

  if (
    hero.state.isHoldingAttack &&
    hero?.hasWeapon() &&
    !hero.hasRangedWeapon() &&
    !hero.state.isAttacking &&
    hero.state.lastAttack < Date.now() - hero.getFullAttackDelay() - 60
  ) {
    updateAttackCooldown(hero);
    hero.state.lastAttackCount = hero.state.lastAttackCount === 1 && hero.isDualWielding() ? 2 : 1;
    hero?.doAttack?.({
      count: hero.state.lastAttackCount,
      castAngle: hero.state.lastAngle,
      direction,
    });
  }

  if (
    (!hero.hasRangedWeapon() && hero.state.isAttacking) ||
    hero?.state.isAiming ||
    hero.state.isHoldingAttack
  ) {
    vx = 0;
    vy = 0;
  }

  hero.vx = vx;
  hero.vy = vy;
  hero.body.setVelocity(vx, vy);
  hero.direction = direction;

  /* If the hero is standing still do not update the server */
  if (!hero.state.isIdle && !hero.state.isEnteringDoor) {
    //if (time % 2 > 1)
    scene.socket.emit("playerInput", {
      vx,
      vy,
      x: hero.x,
      y: hero.y,
      direction: hero.direction,
      roomName: hero.roomName,
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
