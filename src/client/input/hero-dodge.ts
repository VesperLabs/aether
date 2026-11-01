import type { SceneHud } from "@/client/scenes/hud-scene";
import type { SceneMain } from "@/client/scenes/main-scene";
import { canDodge } from "@/rules/movement";
import { isTypableFieldActive } from "./typable-field";
import { updateDodgeCooldown } from "./hero-cooldowns";
import { getHeadingAngle, isTap } from "./tap-aim";

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
    hero.state.aimPressedAt = Date.now();
    gameElement.style.cursor = "none";
  });

  window.addEventListener("HERO_DODGE", () => {
    const hero = mainScene?.hero;
    if (!hero || !stopAiming()) return;
    const now = Date.now();
    const sp = hero.stats?.sp ?? 0;
    if (!canDodge({ state: hero.state, sp, isStunned: hero.hasBuff("stun"), now })) return;
    const angle = isTap(hero.state, now) ? getHeadingAngle(hero) : (hero.state.lastAngle ?? 0);
    hero.state.lastDodge = now;
    hero.state.dodgeAngle = angle;
    /* Keep facing the way you were, so rolling backwards reads as a step back */
    hero.state.dodgeFacing = hero.direction;
    updateDodgeCooldown();
    scene.socket.emit("dodge", { angle });
  });

  window.addEventListener("blur", stopAiming);
}
