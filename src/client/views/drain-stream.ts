import Phaser from "phaser";
import type { DrainResource } from "@/rules/combat";
import type { Player } from "./player";

/** Droplet color for each drained resource: blood, mana, stamina. */
const DRAIN_COLORS: Record<DrainResource, number> = {
  hp: 0xb91c1c,
  mp: 0x3b82f6,
  sp: 0x4ade80,
};
/** Droplets per stream: a bigger drain sends more, within these bounds. */
const MIN_DROPLETS = 2;
const MAX_DROPLETS = 8;
const AMOUNT_PER_DROPLET = 4;
/** Each droplet leaves this long after the last one, in ms. */
const STAGGER_MS = 40;
const FLIGHT_MS = 450;
/** Droplet radius range, in pixels. */
const MIN_RADIUS = 1.5;
const MAX_RADIUS = 2.5;
/** How far a droplet's path bows to the side, in pixels. */
const MAX_ARC_PIXELS = 18;
/** How far droplets scatter from the wound before flying, in pixels. */
const SPRAY_PIXELS = 4;
/** Above every character, like the damage numbers. */
const DROPLET_DEPTH = 99998;

/**
 * Droplets of a drained resource fly from `source`'s body into `target`'s, homing on wherever
 * the target has moved. Visual only; any drain (steal stats, a future drain-over-time buff) can
 * play it.
 */
export function playDrainStream(
  source: Player | undefined,
  target: Player | undefined,
  resource: DrainResource,
  amount = 0,
) {
  const scene = target?.scene;
  if (!scene || !source?.scene || source === target) return;
  /* Don't give away a stealthed drainer */
  if (!target.visible || target.alpha === 0) return;

  const count = Phaser.Math.Clamp(
    MIN_DROPLETS + Math.floor(Math.abs(amount) / AMOUNT_PER_DROPLET),
    MIN_DROPLETS,
    MAX_DROPLETS,
  );
  for (let i = 0; i < count; i++) {
    scene.time.delayedCall(i * STAGGER_MS, () => launchDroplet(scene, source, target, resource));
  }
}

function launchDroplet(
  scene: Phaser.Scene,
  source: Player,
  target: Player,
  resource: DrainResource,
) {
  if (!source.active || !target.active) return;
  const start = {
    x: source.x + Phaser.Math.FloatBetween(-SPRAY_PIXELS, SPRAY_PIXELS),
    y: source.y + source.bodyCenterY + Phaser.Math.FloatBetween(-SPRAY_PIXELS, SPRAY_PIXELS),
  };
  const radius = Phaser.Math.FloatBetween(MIN_RADIUS, MAX_RADIUS);
  const droplet = scene.add
    .circle(start.x, start.y, radius, DRAIN_COLORS[resource])
    .setDepth(DROPLET_DEPTH)
    .setAlpha(0);
  const arc = Phaser.Math.FloatBetween(-MAX_ARC_PIXELS, MAX_ARC_PIXELS);
  const progress = { t: 0 };

  scene.tweens.add({
    targets: progress,
    t: 1,
    duration: FLIGHT_MS,
    ease: "Sine.easeIn",
    onUpdate: () => {
      if (!target.active) return droplet.destroy();
      const { t } = progress;
      const endX = target.x;
      const endY = target.y + target.bodyCenterY;
      /* A bowed path: the bow fades out as the droplet arrives, so it always lands on the body */
      const angle = Math.atan2(endY - start.y, endX - start.x);
      const bow = Math.sin(t * Math.PI) * arc;
      droplet.setPosition(
        Phaser.Math.Linear(start.x, endX, t) - Math.sin(angle) * bow,
        Phaser.Math.Linear(start.y, endY, t) + Math.cos(angle) * bow,
      );
      /* Swells out of the wound, then is absorbed */
      droplet.setAlpha(Math.min(t * 5, 1));
      droplet.setScale(1 - t * 0.6);
    },
    onComplete: () => droplet.destroy(),
  });
}
