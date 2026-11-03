import { getNextAttackCount } from "@/rules/combat";
import Phaser from "phaser";
import { getSpinDirection } from "./spin-direction";
import { getAngleFromDirection } from "@/rules/world";
import { isDodging } from "@/rules/movement/dodge";
import { isKnockedBack } from "@/rules/movement/knockback";
import { isLunging } from "@/rules/movement/lunge";
import {
  createPlayerInputThrottle,
  getFrameSeconds,
  getHeroStep,
  getLatestHeldDirection,
  getShoveStep,
  nextPlayerInput,
} from "@/network/session/hero-control";
import { stepHeroThroughMap } from "@/network/session/hero-motion";
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

/** How far around the hero to look for bodies it overlaps. */
const CROWD_RANGE = 24;

/** Last frame's crowd drift, taken back out before easing so it stops the moment the hero is clear. */
let lastCrowdPush = { x: 0, y: 0 };

/** The bodies near the hero that drift it when it stands in them. */
function getCrowd(scene: SceneMain, hero: SceneMain["hero"]) {
  const neighbours = [];
  for (const group of [scene.npcs, scene.players]) {
    for (const child of group.getChildren() as Array<SceneMain["hero"]>) {
      if (child === hero || child.state?.isDead) continue;
      if (Math.abs(child.x - hero.x) > CROWD_RANGE || Math.abs(child.y - hero.y) > CROWD_RANGE)
        continue;
      neighbours.push({ id: child.id, x: child.x, y: child.y });
    }
  }
  return neighbours;
}

/**
 * Moves the hero through the room's walls with the shared session motion, so it lands exactly
 * where a bot would and the server accepts it. The Phaser body gets no velocity: it only follows.
 */
function moveHero(scene: SceneMain, hero: Player, vx: number, vy: number, seconds: number) {
  hero.body.setVelocity(0, 0);
  if (!scene.tileMap) return;
  const moved = stepHeroThroughMap(
    scene.tileMap,
    { x: hero.x, y: hero.y, vx, vy, bodySize: hero.bodySize },
    seconds,
  );
  hero.setPosition(moved.x, moved.y);
}

/** Sends the hero's movement to the server when `nextPlayerInput` says it is due. */
function emitPlayerInput(
  scene: SceneHud,
  hero: Player,
  vx: number,
  vy: number,
  direction: string,
  unthrottled = false,
) {
  scene._playerInputNet ??= createPlayerInputThrottle();
  const payload = nextPlayerInput(
    scene._playerInputNet,
    {
      x: hero.x,
      y: hero.y,
      roomName: hero.roomName,
      isIdle: hero.state.isIdle,
      isEnteringDoor: hero.state.isEnteringDoor,
    },
    vx,
    vy,
    direction,
    Date.now(),
    unthrottled,
  );
  if (payload) scene.socket.emit("playerInput", payload);
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
  let vx = 0;
  let vy = 0;
  let direction = hero?.direction;
  if (!hero) return;
  /* A shove takes over, even through the stun it comes with: no walking, turning or swinging */
  if (!hero.state.isDead && isKnockedBack(hero.state, Date.now())) {
    const elapsed = Date.now() - (hero.state.knockbackAt ?? 0);
    ({ vx, vy } = getShoveStep(hero.state.knockbackAngle ?? 0, elapsed));
    hero.vx = vx;
    hero.vy = vy;
    moveHero(mainScene, hero, vx, vy, seconds);
    hero.state.isIdle = false;
    emitPlayerInput(scene, hero, vx, vy, hero.direction, true);
    return;
  }

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

  const step = getHeroStep({
    keys: input,
    stick,
    walkSpeed,
    isRooted,
    rollAngle: isRolling ? (hero.state.dodgeAngle ?? 0) : undefined,
    lungeAngle: isLungingNow ? (hero.state.lungeAngle ?? 0) : undefined,
    current: { x: hero.vx ?? 0, y: hero.vy ?? 0 },
    lastCrowdPush,
    seconds,
    self: hero,
    neighbours: isLungingNow || isRolling ? [] : getCrowd(mainScene, hero),
  });
  ({ vx, vy } = step);
  lastCrowdPush = step.crowdPush;
  hero.vx = vx;
  hero.vy = vy;
  moveHero(mainScene, hero, vx, vy, seconds);
  /* A melee swing commits to the way it started; bows keep turning to aim */
  if (isLungingNow || !(hero.state.isAttacking && !hero.hasRangedWeapon()))
    hero.direction = direction;

  /* Every frame of a roll and the one after it, so an attack out of a roll swings from where you are */
  const wasRolling = hero.state.wasRolling;
  hero.state.wasRolling = isRolling;
  emitPlayerInput(scene, hero, vx, vy, hero.direction, isRolling || !!wasRolling);
  hero.state.isIdle = hero.vx === vx && hero.vy === vy && vx === 0 && vy === 0;
}
