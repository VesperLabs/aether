import { getNextAttackCount } from "@/rules/combat";
import Phaser from "phaser";
import { getSpinDirection } from "./spin-direction";
import { getAngleFromDirection } from "@/rules/world";
import { isDodging } from "@/rules/movement/dodge";
import { isKnockedBack } from "@/rules/movement/knockback";
import { isLunging } from "@/rules/movement/lunge";
import {
  getFrameSeconds,
  getLatestHeldDirection,
  getShoveStep,
} from "@/network/session/hero-control";
import { createHeroDrive, driveHero, type HeroFrame } from "@/network/session/hero-driver";
import type { Player } from "@/client/views/player";
import { updateAttackCooldown, updateSpellCooldown } from "./hero-cooldowns";
import { isTypableFieldActive } from "./typable-field";
import type { SceneHud } from "@/client/scenes/hud-scene";
import type { SceneMain } from "@/client/scenes/main-scene";

const { Between } = Phaser.Math.Angle;

/** The direction of the most recently pressed movement key that is still held. */
function getLatestKeyDirection(keys: SceneHud["cursorKeys"]) {
  const held: [Phaser.Input.Keyboard.Key[], string][] = [
    [[keys.w, keys.up], "up"],
    [[keys.s, keys.down], "down"],
    [[keys.a, keys.left], "left"],
    [[keys.d, keys.right], "right"],
  ];
  return getLatestHeldDirection(
    held.flatMap(([pair, direction]) =>
      pair.map((key) => ({ direction, isDown: key.isDown, timeDown: key.timeDown })),
    ),
  );
}

/**
 * Moves the hero one frame through the shared `driveHero`, the same code bots use, then shows it:
 * the Phaser body gets no velocity and only follows the container.
 */
function driveDirectHero(
  scene: SceneHud,
  mainScene: SceneMain,
  hero: Player,
  frame: Omit<HeroFrame, "hero" | "map" | "players" | "isEnteringDoor" | "now">,
) {
  scene.heroDrive ??= createHeroDrive();
  const result = driveHero(scene.heroDrive, {
    ...frame,
    hero: {
      id: hero.id,
      x: hero.x,
      y: hero.y,
      bodySize: hero.bodySize,
      roomName: hero.roomName,
      walkSpeed: hero.stats.walkSpeed,
    },
    map: mainScene.tileMap,
    players: mainScene.players.getChildren() as Player[],
    isEnteringDoor: hero.state.isEnteringDoor,
    now: Date.now(),
  });
  hero.vx = result.vx;
  hero.vy = result.vy;
  hero.body.setVelocity(0, 0);
  hero.setPosition(result.x, result.y);
  if (result.input) scene.socket.emit("playerInput", result.input);
}

/** Reads keyboard, joystick and pointer and applies them to the hero for this frame. */
export function moveDirectHero(scene: SceneHud, deltaMs: number) {
  /* Capped so a tab coming back from sleep does not jump to full speed in one frame */
  const seconds = getFrameSeconds(deltaMs);
  const isTouch = scene.sys.game.device.input.touch;
  const pointer = scene.input.activePointer;
  const mainScene = scene.scene.manager.getScene("SceneMain") as SceneMain;
  const hero = mainScene?.hero;
  let lastAngle = hero?.state?.lastAngle;
  let direction = hero?.direction;
  if (!hero) return;
  /* A shove takes over, even through the stun it comes with: no walking, turning or swinging */
  if (!hero.state.isDead && isKnockedBack(hero.state, Date.now())) {
    const elapsed = Date.now() - (hero.state.knockbackAt ?? 0);
    const { vx, vy } = getShoveStep(hero.state.knockbackAngle ?? 0, elapsed);
    driveDirectHero(scene, mainScene, hero, {
      shove: { x: vx, y: vy },
      direction: hero.direction,
      seconds,
    });
    return;
  }

  /* If the user is dead or typing stop them from moving */
  if (hero?.state?.isDead || isTypableFieldActive() || hero?.hasBuff("stun")) {
    hero.vx = 0;
    hero.vy = 0;
    hero.body.setVelocity(0, 0);
    return;
  }

  const joystick = scene.joystick;

  const keys = scene.cursorKeys;
  const up = keys.w.isDown || keys.up.isDown;
  const left = keys.a.isDown || keys.left.isDown;
  const down = keys.s.isDown || keys.down.isDown;
  const right = keys.d.isDown || keys.right.isDown;
  const input = { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
  direction = getLatestKeyDirection(keys) ?? direction;
  const stick = { x: joystick.deltaX, y: joystick.deltaY };

  /* Keeps bows facing the right direction if you try to spin out of an attack */
  if (hero.state.isAttacking && (input.x || input.y)) {
    lastAngle = Phaser.Math.DegToRad(getAngleFromDirection(direction));
  }

  if (joystick.deltaX || joystick.deltaY) {
    direction = getSpinDirection(hero, { x: hero.x + stick.x, y: hero.y + stick.y });
    /* Latest idle check, we set the lastAngle so it's fresh */
    lastAngle = Math.atan2(joystick.deltaY, joystick.deltaX);
  }

  /* Spin hero when aiming */
  if (hero?.state.isAiming || hero.state.isAimingDodge) {
    if (!isTouch) {
      const cursorPoint = pointer.positionToCamera(mainScene.cameras.main) as Phaser.Math.Vector2;
      /* Only a rooted aim turns the body; aiming a dodge keeps facing the way you walk */
      if (hero.state.isAiming) {
        direction = getSpinDirection({ x: hero.x, y: hero.y + hero.bodyOffsetY }, cursorPoint);
      }
      lastAngle = Between(hero.x, hero.y + hero.bodyOffsetY, cursorPoint.x, cursorPoint.y);
    }
    if (hero?.state?.lastAngle !== lastAngle) {
      //TODO only send this if the difference is greater than 10 or something
      scene.socket.emit("changeDirection", { direction, lastAngle });
    }
  }

  /* A roll commits to the way it was aimed, still facing the way you were */
  const isRolling = isDodging(hero.state, Date.now());
  if (isRolling) {
    lastAngle = hero.state.dodgeAngle ?? 0;
    direction = hero.state.dodgeFacing ?? direction;
  }

  /* Unlike a roll, a lunge faces the way it goes for the whole dash */
  const isLungingNow = isLunging(hero.state, Date.now());
  if (isLungingNow) {
    lastAngle = hero.state.lungeAngle ?? 0;
    direction = getSpinDirection(hero, {
      x: hero.x + Math.cos(lastAngle),
      y: hero.y + Math.sin(lastAngle),
    });
  }

  hero.state.lastAngle = lastAngle;
  const lastAbilitySlot = hero?.state?.lastAbilitySlot;

  if (
    hero.state.isHoldingAttack &&
    hero?.hasWeapon() &&
    !hero.hasRangedWeapon() &&
    !hero.state.isAttacking &&
    hero.state.lastAttack < Date.now() - hero.getFullAttackDelay() - 60
  ) {
    if (lastAbilitySlot) {
      updateSpellCooldown(hero, lastAbilitySlot);
      if (hero.canCastSpell(lastAbilitySlot, false)) {
        updateAttackCooldown(hero);
      }
    } else {
      updateAttackCooldown(hero);
    }

    hero?.doAttack?.({
      count: getNextAttackCount(hero.state.lastAttackCount, hero),
      castAngle: hero.state.lastAngle,
      direction,
      abilitySlot: lastAbilitySlot,
    });
  }

  /* Attacking and aiming root the hero */
  const isRooted =
    (!hero.hasRangedWeapon() && hero.state.isAttacking) ||
    !!hero?.state.isAiming ||
    !!hero.state.isHoldingAttack;

  /* A melee swing commits to the way it started; bows keep turning to aim */
  if (isLungingNow || !(hero.state.isAttacking && !hero.hasRangedWeapon()))
    hero.direction = direction;

  /* Every frame of a roll and the one after it, so an attack out of a roll swings from where you are */
  const wasRolling = hero.state.wasRolling;
  hero.state.wasRolling = isRolling;
  driveDirectHero(scene, mainScene, hero, {
    keys: input,
    stick,
    isRooted,
    rollAngle: isRolling ? (hero.state.dodgeAngle ?? 0) : undefined,
    lungeAngle: isLungingNow ? (hero.state.lungeAngle ?? 0) : undefined,
    direction: hero.direction,
    unthrottled: isRolling || !!wasRolling,
    seconds,
  });
  hero.state.isIdle = hero.vx === 0 && hero.vy === 0;
}
