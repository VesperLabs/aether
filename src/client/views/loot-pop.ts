import Phaser from "phaser";
import { FLASH_MS } from "./death-flash";
import type { LootItem } from "./loot-item";
import type { Player } from "./player";

/** How far a scattered drop lands from its spot, in pixels. */
const LAND_DISTANCE = [6, 14] as const;
/** How high it arcs, how long it's in the air, and its little bounce on landing. */
const ARC_PX = 14;
const HOP_MS = 380;
const BOUNCE_PX = 3;
const BOUNCE_MS = 140;

/** How a drop leaves its source: a dying mob's waits out the death flash and scatters. */
interface PopOptions {
  delay?: number;
  scatter?: boolean;
}

/**
 * A drop tossed out of a body: hidden through `delay` (a mob's death flash), then thrown in an
 * arc from the source's middle to where the server put it, drawn over the source unless
 * it lands behind it. With `scatter`, several drops spread a few pixels around that spot. Visual only.
 */
export function popLootFrom(
  loot: LootItem,
  source: Player,
  { delay = FLASH_MS, scatter = true }: PopOptions = {},
) {
  const { scene } = loot;
  const restingDepth = loot.depth;
  const endY = loot.y;
  const startX = source.x;
  const startY = source.y + source.bodyCenterY;
  const angle = Math.random() * Math.PI * 2;
  const distance = scatter ? Phaser.Math.Between(...LAND_DISTANCE) : 0;
  const landX = Math.round(loot.x + Math.cos(angle) * distance);
  /* Squashed on the ground plane, so the spread reads as around the mob's feet */
  const landY = Math.round(endY + Math.sin(angle) * distance * 0.6);
  loot
    .setPosition(startX, startY)
    .setVisible(false)
    /* A mob's drop stays over its dissolving body; a player's toss goes behind them when it lands behind */
    .setDepth(source.depth + (scatter || landY >= source.y ? 1 : -1));

  scene.tweens.addCounter({
    from: 0,
    to: 1,
    delay,
    duration: HOP_MS,
    onStart: () => loot.setVisible(true),
    onUpdate: (tween) => {
      const t = tween.getValue() ?? 0;
      /* Whole pixels, so it stays crisp: steady sideways, up then down in a parabola */
      loot.x = Math.round(startX + (landX - startX) * t);
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
