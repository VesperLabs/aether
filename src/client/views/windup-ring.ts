import type { Player } from "./player";

/**
 * Fills the ring in a fighting NPC's bubble as it winds up, full the moment its attack lands,
 * then empties it again. The bubble draws whatever `windup` holds each frame.
 */
export function playWindupRing(attacker: Player, windupMs: number, kind: "attack" | "cast") {
  const { scene, bubble } = attacker;
  if (!scene || !bubble) return;
  bubble.windup = { progress: 0, kind };
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: windupMs,
    onUpdate: (tween) => {
      if (attacker.state?.isDead) return tween.complete();
      bubble.windup.progress = tween.getValue() ?? 0;
    },
    onComplete: () => {
      bubble.windup.progress = 0;
    },
  });
}
