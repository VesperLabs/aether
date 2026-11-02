import type Phaser from "phaser";

/** Emitted by a character the moment it dies (`Player.doDeath`). */
export const CHARACTER_DIED = "characterDied";

/**
 * Ends `effect` when `character` dies, so no spell, aura or other effect riding a character is
 * left behind where it fell. Effects call this themselves; the death code knows none of them.
 */
export function endOnDeath(
  character: Phaser.Events.EventEmitter,
  effect: { destroy: () => void; once?: (event: string, fn: () => void) => unknown },
) {
  const end = () => effect.destroy();
  character.once(CHARACTER_DIED, end);
  effect.once?.("destroy", () => character.off(CHARACTER_DIED, end));
}
