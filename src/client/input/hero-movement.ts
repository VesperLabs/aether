import { getNextAttackCount } from "@/rules/combat";
import Phaser from "phaser";
import { getSpinDirection } from "./spin-direction";
import { getAngleFromDirection } from "@/rules/world";
import {
  ATTACK_WALK_SPEED_SCALE,
  approachVelocity,
  getDodgeVelocity,
  getKnockbackVelocity,
  getWalkVelocity,
  getLungeVelocity,
  getSeparationVelocity,
  isDodging,
  isKnockedBack,
  isLunging,
} from "@/rules/movement";
import { emitPlayerInput } from "@/client/net/player-input";
import { updateAttackCooldown, updateSpellCooldown } from "./hero-cooldowns";
import { isTypableFieldActive } from "./typable-field";
import type { SceneHud } from "@/client/scenes/hud-scene";
import { getGamepadAim, getGamepadAimAngle, getGamepadStick } from "./gamepad";
import { getLastDevice, isModalOpen } from "./last-device";
import { isMenuMode } from "./pad-nav";
import { heldSince } from "./held-keys";
import { getBindings, type BindAction } from "./key-bindings";
import type { Player } from "@/client/views/player";
import type { SceneMain } from "@/client/scenes/main-scene";

const { Between } = Phaser.Math.Angle;

const MOVES = [
  ["moveUp", "up"],
  ["moveDown", "down"],
  ["moveLeft", "left"],
  ["moveRight", "right"],
] as const;

/** When the action's earliest-held bound key went down, or undefined when none is held. */
function heldAction(action: BindAction) {
  const times = getBindings()
    .keyboard[action].map(heldSince)
    .filter((t) => t !== undefined);
  return times.length ? Math.max(...times) : undefined;
}

/** The direction of the most recently pressed movement key that is still held. */
function getLatestKeyDirection() {
  let latest: string | undefined;
  let latestTime = -Infinity;
  for (const [action, direction] of MOVES) {
    const time = heldAction(action);
    if (time !== undefined && time > latestTime) {
      latestTime = time;
      latest = direction;
    }
  }
  return latest;
}

/** How far around the hero to look for bodies it overlaps. */
const CROWD_RANGE = 24;

/** Last frame's crowd drift, taken back out before easing so it stops the moment the hero is clear. */
let lastCrowdPush = { x: 0, y: 0 };

/** The drift other characters give the hero when it stands in them. Walking always wins. */
function getCrowdPush(
  scene: SceneMain,
  hero: SceneMain["hero"],
  walkSpeed: number,
  walk: { x: number; y: number },
) {
  const neighbours = [];
  for (const group of [scene.npcs, scene.players]) {
    for (const child of group.getChildren() as Array<SceneMain["hero"]>) {
      if (child === hero || child.state?.isDead) continue;
      if (Math.abs(child.x - hero.x) > CROWD_RANGE || Math.abs(child.y - hero.y) > CROWD_RANGE)
        continue;
      neighbours.push({ id: child.id, x: child.x, y: child.y });
    }
  }
  return getSeparationVelocity(hero, neighbours, walkSpeed, walk);
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
  /* A shove takes over, even through the stun it comes with: no walking, turning or swinging */
  if (!hero.state.isDead && isKnockedBack(hero.state, Date.now())) {
    const elapsed = Date.now() - (hero.state.knockbackAt ?? 0);
    ({ x: vx, y: vy } = getKnockbackVelocity(hero.state.knockbackAngle ?? 0, elapsed));
    hero.vx = vx;
    hero.vy = vy;
    hero.body.setVelocity(vx, vy);
    hero.state.isIdle = false;
    emitPlayerInput(scene, hero, vx, vy, hero.direction, true);
    return;
  }

  /* Dead, typing or in a modal (whose arrows and triggers step its tabs): stand still */
  if (
    hero?.state?.isDead ||
    isTypableFieldActive() ||
    isModalOpen() ||
    isMenuMode() ||
    hero?.hasBuff("stun")
  ) {
    hero.vx = 0;
    hero.vy = 0;
    hero.body.setVelocity(0, 0);
    hero.queuedCastSlot = undefined;
    return;
  }

  const walkSpeed = hero.stats.walkSpeed;
  const joystick = scene.joystick;

  const isHeld = (action: BindAction) => (heldAction(action) === undefined ? 0 : 1);
  const input = {
    x: isHeld("moveRight") - isHeld("moveLeft"),
    y: isHeld("moveDown") - isHeld("moveUp"),
  };
  direction = getLatestKeyDirection() ?? direction;
  ({ x: vx, y: vy } = getWalkVelocity(input, walkSpeed));

  /* Keeps bows facing the right direction if you try to spin out of an attack */
  if (hero.state.isAttacking && (vx || vy)) {
    lastAngle = Phaser.Math.DegToRad(getAngleFromDirection(direction));
  }

  /* The touch joystick, else a controller's left stick */
  const stick =
    joystick.deltaX || joystick.deltaY
      ? { x: joystick.deltaX, y: joystick.deltaY }
      : getGamepadStick();
  if (stick.x || stick.y) {
    ({ x: vx, y: vy } = getWalkVelocity(stick, walkSpeed));
    direction = getSpinDirection(hero, { x: hero.x + vx, y: hero.y + vy });
    /* Latest idle check, we set the lastAngle so it's fresh */
    lastAngle = Math.atan2(stick.y, stick.x);
  }

  /* Spin hero when aiming */
  if (hero?.state.isAiming || hero.state.isAimingDodge) {
    /* With a controller, the right stick aims; let go of it and the aim stays where it was */
    if (getLastDevice() === "gamepad") {
      const angle = getGamepadAimAngle();
      if (angle !== null) {
        const from = { x: hero.x, y: hero.y + hero.bodyOffsetY };
        const target = { x: from.x + Math.cos(angle), y: from.y + Math.sin(angle) };
        if (hero.state.isAiming) direction = getSpinDirection(from, target);
        lastAngle = angle;
      }
    } else if (!isTouch) {
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

  /* With a controller, the right stick turns the hero while it attacks (no aimer shown), so
   * swings go where it points while the left stick walks. Walking alone faces the way you go */
  const isAttacking = hero.state.isAttacking || hero.state.isHoldingAttack;
  if (isAttacking && !hero.state.isAiming && getLastDevice() === "gamepad") {
    const aim = getGamepadAim();
    const angle = getGamepadAimAngle();
    if ((aim.x || aim.y) && angle !== null) {
      direction = getSpinDirection(
        { x: hero.x, y: hero.y + hero.bodyOffsetY },
        { x: hero.x + Math.cos(angle), y: hero.y + hero.bodyOffsetY + Math.sin(angle) },
      );
      lastAngle = angle;
      if (hero.state.lastAngle !== lastAngle) {
        scene.socket.emit("changeDirection", { direction, lastAngle });
      }
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
    hero?.canAttack() &&
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

  /* A released spell roots the hero until it lands; only attacking calls it off */
  if (hero.isCasting || hero.queuedCastSlot !== undefined) {
    vx = 0;
    vy = 0;
  }

  /* Attacking and aiming root the hero */
  if (
    (!hero.hasRangedWeapon() && hero.state.isAttacking) ||
    hero?.state.isAiming ||
    hero.state.isHoldingAttack
  ) {
    vx *= ATTACK_WALK_SPEED_SCALE;
    vy *= ATTACK_WALK_SPEED_SCALE;
  }

  if (isLungingNow) {
    ({ x: vx, y: vy } = getLungeVelocity(hero.state.lungeAngle ?? 0));
  } else if (isRolling) {
    ({ x: vx, y: vy } = getDodgeVelocity(hero.state.dodgeAngle ?? 0));
  } else {
    /* Coming out of a roll drops straight to walking pace, so it can't carry past the roll */
    let current = { x: (hero.vx ?? 0) - lastCrowdPush.x, y: (hero.vy ?? 0) - lastCrowdPush.y };
    const speed = Math.hypot(current.x, current.y);
    if (speed > walkSpeed) {
      current = { x: (current.x / speed) * walkSpeed, y: (current.y / speed) * walkSpeed };
    }
    ({ x: vx, y: vy } = approachVelocity(current, { x: vx, y: vy }, walkSpeed, seconds));
    lastCrowdPush = getCrowdPush(mainScene, hero, walkSpeed, { x: vx, y: vy });
    vx += lastCrowdPush.x;
    vy += lastCrowdPush.y;
  }
  hero.vx = vx;
  hero.vy = vy;
  hero.body.setVelocity(vx, vy);
  /* A melee swing commits to the way it started; bows keep turning to aim */
  if (isLungingNow || !(hero.state.isAttacking && !hero.hasRangedWeapon()))
    hero.direction = direction;

  /* Every frame of a roll and the one after it, so an attack out of a roll swings from where you are */
  const wasRolling = hero.state.wasRolling;
  hero.state.wasRolling = isRolling;
  emitPlayerInput(scene, hero, vx, vy, hero.direction, isRolling || !!wasRolling);
  startQueuedCast(scene, hero);
  hero.state.isIdle = hero.vx === vx && hero.vy === vy && vx === 0 && vy === 0;
}

/** Sent after the stopped position, so the server never sees the cast start on a moving hero. */
function startQueuedCast(scene: SceneHud, hero: Player) {
  const abilitySlot = hero.queuedCastSlot;
  if (abilitySlot === undefined || hero.vx || hero.vy) return;
  hero.queuedCastSlot = undefined;
  /* Rooted from here: the server's reply ends this if it refuses the cast */
  hero.isCasting = true;
  scene.socket.emit("startCast", { abilitySlot });
}
