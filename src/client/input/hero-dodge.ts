import type { SceneHud } from "@/client/scenes/hud-scene";
import type { SceneMain } from "@/client/scenes/main-scene";
import { canDodge } from "@/rules/movement";
import { getAngleFromDirection } from "@/rules/world";
import type { CharacterState } from "@/rules/character";
import type { Player } from "@/client/views/player";
import { isTypableFieldActive } from "./typable-field";
import { updateDodgeCooldown } from "./hero-cooldowns";

/** A press shorter than this is a tap: roll the way you're going, without aiming. */
const DODGE_TAP_MS = 250;

/** The aimer only shows once the press is long enough to be a hold, so a tap doesn't flash it. */
export function isDodgeAimShown(state: CharacterState, now: number) {
  return !!state.isAimingDodge && now - (state.dodgePressedAt ?? now) >= DODGE_TAP_MS;
}

/** Where the hero is heading: its movement, or the way it faces when standing still. */
function getHeadingAngle(hero: Player) {
  if (hero.vx || hero.vy) return Math.atan2(hero.vy ?? 0, hero.vx ?? 0);
  return (getAngleFromDirection(hero.direction) * Math.PI) / 180;
}

/**
 * Dodge button (Shift, or the mobile button): a tap rolls the way you're going; holding it shows
 * the aimer without rooting the hero, and releasing rolls that way. The hero starts rolling right away; the server checks and may correct.
 */
export function addDodgeListeners(scene: SceneHud) {
  const mainScene = scene.scene.manager.getScene("SceneMain") as SceneMain;
  const gameElement = document.getElementById("game") as HTMLElement;

  const stopAiming = () => {
    const hero = mainScene?.hero;
    if (!hero?.state.isAimingDodge) return false;
    hero.state.isAimingDodge = false;
    gameElement.style.cursor = "default";
    return true;
  };

  window.addEventListener("HERO_DODGE_START", () => {
    const hero = mainScene?.hero;
    if (!hero || isTypableFieldActive() || hero.state.isAiming || hero.state.isDead) return;
    /* Not `isAiming`: that roots the hero and plays the standing pose. */
    hero.state.isAimingDodge = true;
    hero.state.dodgePressedAt = Date.now();
    gameElement.style.cursor = "none";
  });

  window.addEventListener("HERO_DODGE", () => {
    const hero = mainScene?.hero;
    if (!hero || !stopAiming()) return;
    const now = Date.now();
    const sp = hero.stats?.sp ?? 0;
    if (!canDodge({ state: hero.state, sp, isStunned: hero.hasBuff("stun"), now })) return;
    const isTap = now - (hero.state.dodgePressedAt ?? now) < DODGE_TAP_MS;
    const angle = isTap ? getHeadingAngle(hero) : (hero.state.lastAngle ?? 0);
    hero.state.lastDodge = now;
    hero.state.dodgeAngle = angle;
    /* Keep facing the way you were, so rolling backwards reads as a step back */
    hero.state.dodgeFacing = hero.direction;
    updateDodgeCooldown();
    scene.socket.emit("dodge", { angle });
  });

  window.addEventListener("blur", stopAiming);
}
