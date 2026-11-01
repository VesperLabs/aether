import type { Player } from "./player";

/**
 * Fills the "!" bubble over an NPC's head with a countdown ring as it winds up, full the moment
 * its attack lands, then puts the "!" back.
 */
export function playWindupRing(attacker: Player, windupMs: number) {
  const { scene, bubble } = attacker;
  if (!scene || !bubble) return;
  bubble.setCountdown(0);
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: windupMs,
    onUpdate: (tween) => {
      if (!bubble.active) return;
      if (attacker.state?.isDead) return tween.complete();
      bubble.setCountdown(tween.getValue() ?? 0);
    },
    onComplete: () => {
      if (bubble.active) bubble.setCountdown(null);
    },
  });
}
