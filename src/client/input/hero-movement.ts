import Phaser from "phaser";
import { getSpinDirection } from "@/network/session/hero/spin-direction";
import { getFrameSeconds, getLatestHeldDirection } from "@/network/session/hero-control";
import type { HeroIntent, HeroSwing } from "@/network/session/hero/hero-session";
import type { Player } from "@/client/views/player";
import { startSwingCooldowns } from "./hero-cooldowns";
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

/** Keyboard, joystick and pointer as what the player wants this frame. */
function readIntent(scene: SceneHud, mainScene: SceneMain, hero: Player): HeroIntent {
  const { cursorKeys: keys, joystick } = scene;
  const up = keys.w.isDown || keys.up.isDown;
  const left = keys.a.isDown || keys.left.isDown;
  const down = keys.s.isDown || keys.down.isDown;
  const right = keys.d.isDown || keys.right.isDown;
  let direction = getLatestKeyDirection(keys) ?? hero.direction;
  let angle: number | undefined;
  const stick = { x: joystick.deltaX, y: joystick.deltaY };
  if (stick.x || stick.y) {
    direction = getSpinDirection(hero, { x: hero.x + stick.x, y: hero.y + stick.y });
    angle = Math.atan2(stick.y, stick.x);
  }
  const { isAiming, isAimingDodge, isHoldingAttack, lastAbilitySlot } = hero.state;
  /* Aiming with the pointer spins the hero; on touch the stick aims */
  if ((isAiming || isAimingDodge) && !scene.sys.game.device.input.touch) {
    const cursor = scene.input.activePointer.positionToCamera(
      mainScene.cameras.main,
    ) as Phaser.Math.Vector2;
    const body = { x: hero.x, y: hero.y + hero.bodyOffsetY };
    /* Only a rooted aim turns the body; aiming a dodge keeps facing the way you walk */
    if (isAiming) direction = getSpinDirection(body, cursor);
    angle = Between(body.x, body.y, cursor.x, cursor.y);
  }
  return {
    keys: { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) },
    stick,
    direction,
    angle,
    isAiming,
    isAimingDodge,
    isHoldingAttack,
    abilitySlot: lastAbilitySlot,
    isBlocked: isTypableFieldActive(),
  };
}

/** Plays a swing the session sent: its cooldowns and its animation. */
export function playHeroSwing(hero: Player, swing: HeroSwing) {
  Object.assign(hero.state, (hero.scene as SceneMain).heroSession.combat);
  startSwingCooldowns(hero, swing);
  hero.doAttack(swing);
}

/**
 * Reads input into an intent and moves the hero one frame through its session, the same code bots
 * use; the sprite only shows the result (the Phaser body gets no velocity and follows the container).
 */
export function moveDirectHero(scene: SceneHud, deltaMs: number) {
  const mainScene = scene.scene.manager.getScene("SceneMain") as SceneMain;
  const hero = mainScene?.hero;
  if (!hero) return;
  const session = mainScene.heroSession;
  /* Capped so a tab coming back from sleep does not jump to full speed in one frame */
  const seconds = getFrameSeconds(deltaMs);
  const view = session.frame(readIntent(scene, mainScene, hero), {
    seconds,
    map: mainScene.tileMap,
    crowd: {
      npcs: mainScene.npcs.getChildren() as Player[],
      players: mainScene.players.getChildren() as Player[],
    },
    isEnteringDoor: hero.state.isEnteringDoor,
  });
  /* The sprite shows the session's timings: rolls, lunges, swings and cooldown rings */
  Object.assign(hero.state, session.combat);
  hero.body.setVelocity(0, 0);
  if (!view) return;
  hero.setPosition(view.x, view.y);
  hero.vx = view.vx;
  hero.vy = view.vy;
  hero.direction = view.direction;
  hero.state.lastAngle = view.lastAngle;
  hero.state.isIdle = view.isIdle;
  if (view.swing) playHeroSwing(hero, view.swing);
}
