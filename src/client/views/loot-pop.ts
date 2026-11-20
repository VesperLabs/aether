import Phaser from "phaser";
import { FLASH_MS } from "./death-flash";
import type { LootItem } from "./loot-item";
import type { Player } from "./player";

/** How far a drop lands from where its mob stood, in pixels. */
const LAND_DISTANCE = [6, 14] as const;
/** How high it arcs, how long it's in the air, and its little bounce on landing. */
const ARC_PX = 14;
const HOP_MS = 380;
const BOUNCE_PX = 3;
const BOUNCE_MS = 140;

/**
 * A drop popping out of its mob's body as it dies: hidden through the death flash, then tossed
 * in an arc to a spot beside it, drawn over the body so it never sits under the dissolve. Several
 * drops scatter. Visual only: the loot is where the server put it, give or take a few pixels.
 */
export function popLootFrom(loot: LootItem, mob: Player) {
  const { scene } = loot;
  const restingDepth = loot.depth;
  const endX = loot.x;
  const endY = loot.y;
  const angle = Math.random() * Math.PI * 2;
  const distance = Phaser.Math.Between(...LAND_DISTANCE);
  const landX = Math.round(endX + Math.cos(angle) * distance);
  /* Squashed on the ground plane, so the spread reads as around the mob's feet */
  const landY = Math.round(endY + Math.sin(angle) * distance * 0.6);
  const startY = endY + mob.bodyCenterY;
  loot
    .setPosition(endX, startY)
    .setVisible(false)
    .setDepth(mob.depth + 1);

  scene.tweens.addCounter({
    from: 0,
    to: 1,
    delay: FLASH_MS,
    duration: HOP_MS,
    onStart: () => loot.setVisible(true),
    onUpdate: (tween) => {
      const t = tween.getValue() ?? 0;
      /* Whole pixels, so it stays crisp: steady sideways, up then down in a parabola */
      loot.x = Math.round(endX + (landX - endX) * t);
      loot.y = Math.round(startY + (landY - startY) * t - ARC_PX * 4 * t * (1 - t));
    },
    onComplete: () => {
      loot.setPosition(landX, landY);
      scene.tweens.add({
        targets: loot,
        y: landY - BOUNCE_PX,
        duration: BOUNCE_MS / 2,
        yoyo: true,
        ease: "Quad.easeOut",
        onComplete: () => loot.setDepth(restingDepth - endY + landY),
      });
    },
  });
}
