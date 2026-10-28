import Phaser from "phaser";
import { getSpinDirection } from "./spin-direction";
import { getAngleFromDirection } from "@/rules/world";
import { ATTACK_WALK_SPEED_SCALE, approachVelocity, getWalkVelocity } from "@/rules/movement";
import { emitPlayerInput } from "@/client/net/player-input";
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
  let latest: string | undefined;
  let latestTime = -Infinity;
  for (const [pair, direction] of held) {
    for (const key of pair) {
      if (key.isDown && key.timeDown > latestTime) {
        latestTime = key.timeDown;
        latest = direction;
      }
    }
  }
  return latest;
}

/** Reads keyboard, joystick and pointer and applies them to the hero for this frame. */
export function moveDirectHero(scene: SceneHud, deltaMs: number) {
  /* Capped so a tab coming back from sleep does not jump to full speed in one frame */
  const seconds = Math.min(deltaMs, 100) / 1000;
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

  const keys = scene.cursorKeys;
  const up = keys.w.isDown || keys.up.isDown;
  const left = keys.a.isDown || keys.left.isDown;
  const down = keys.s.isDown || keys.down.isDown;
  const right = keys.d.isDown || keys.right.isDown;
  const input = { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
  direction = getLatestKeyDirection(keys) ?? direction;
  ({ x: vx, y: vy } = getWalkVelocity(input, walkSpeed));

  /* Keeps bows facing the right direction if you try to spin out of an attack */
  if (hero.state.isAttacking && (vx || vy)) {
    lastAngle = Phaser.Math.DegToRad(getAngleFromDirection(direction));
  }

  if (joystick.deltaX || joystick.deltaY) {
    ({ x: vx, y: vy } = getWalkVelocity({ x: joystick.deltaX, y: joystick.deltaY }, walkSpeed));
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

  /* Attacking and aiming slow the hero down instead of rooting them */
  if (
    (!hero.hasRangedWeapon() && hero.state.isAttacking) ||
    hero?.state.isAiming ||
    hero.state.isHoldingAttack
  ) {
    vx *= ATTACK_WALK_SPEED_SCALE;
    vy *= ATTACK_WALK_SPEED_SCALE;
  }

  ({ x: vx, y: vy } = approachVelocity(
    { x: hero.vx ?? 0, y: hero.vy ?? 0 },
    { x: vx, y: vy },
    walkSpeed,
    seconds,
  ));
  hero.vx = vx;
  hero.vy = vy;
  hero.body.setVelocity(vx, vy);
  hero.direction = direction;

  emitPlayerInput(scene, hero, vx, vy, direction);
  hero.state.isIdle = hero.vx === vx && hero.vy === vy && vx === 0 && vy === 0;
}
