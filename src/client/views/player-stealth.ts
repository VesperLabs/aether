import { distanceTo } from "@/rules/world";
import { MIN_STEALTH_ALPHA, calculateStealthVisibilityPercent } from "@/rules/combat";
import { approachAlpha } from "./player-animation";
import type { Player } from "./player";

/** Fades a player toward how visible they should be, in alpha per second so it doesn't depend on frame rate. */
export function fadeStealth(player: Player, delta: number) {
  const stealthBuff = player.getBuff("stealth");
  const seconds = delta / 1000;
  let alpha = player.alpha;
  if (!stealthBuff) {
    if (alpha === 1) return;
    alpha = approachAlpha(alpha, 1, 4 * seconds);
  } else if (player.isHero) {
    // always will see your own player at this alpha
    alpha = approachAlpha(alpha, MIN_STEALTH_ALPHA, 4 * seconds);
  } else {
    // how we see other stealthed players
    const observer = player.scene?.hero;
    const distance = observer ? distanceTo(player, observer) : Infinity;
    const target = calculateStealthVisibilityPercent({ distance, observer, stealthBuff, player });
    alpha = approachAlpha(alpha, target, 1.5 * seconds);
  }
  player.setAlpha(alpha);
}
