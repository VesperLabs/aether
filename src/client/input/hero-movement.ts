import Phaser from "phaser";
import { getSpinDirection } from "./spin-direction";
import { getAngleFromDirection } from "@/rules/world";
import { emitPlayerInput } from "@/client/net/player-input";
import { updateAttackCooldown, updateSpellCooldown } from "./hero-cooldowns";
import { isTypableFieldActive } from "./typable-field";
import type { SceneHud } from "@/client/scenes/hud-scene";
import type { SceneMain } from "@/client/scenes/main-scene";

const { Between } = Phaser.Math.Angle;

/** Reads keyboard, joystick and pointer and applies them to the hero for this frame. */
export function moveDirectHero(scene: SceneHud) {
  const isTouch = scene.sys.game.device.input.touch;
  const pointer = scene.input.activePointer;
  const mainScene = scene.scene.manager.getScene("SceneMain") as SceneMain;
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
  const joystick = scene.joystick;

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
      const cursorPoint = pointer.positionToCamera(mainScene.cameras.main) as Phaser.Math.Vector2;
      direction = getSpinDirection({ x: hero.x, y: hero.y + hero.bodyOffsetY }, cursorPoint);
      lastAngle = Between(hero.x, hero.y + hero.bodyOffsetY, cursorPoint.x, cursorPoint.y);
    }
    if (hero?.state?.lastAngle !== lastAngle) {
      //TODO only send this if the difference is greater than 10 or something
      scene.socket.emit("changeDirection", { direction, lastAngle });
    }
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
      count: hero.state.lastAttackCount === 1 && hero.isDualWielding() ? 2 : 1,
      castAngle: hero.state.lastAngle,
      direction,
      abilitySlot: lastAbilitySlot,
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

  emitPlayerInput(scene, hero, vx, vy, direction);
  hero.state.isIdle = hero.vx === vx && hero.vy === vy && vx === 0 && vy === 0;
}
