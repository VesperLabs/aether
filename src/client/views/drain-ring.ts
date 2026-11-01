import type { DrainResource } from "@/rules/combat";
import type { Player } from "./player";

/** Ring color for each drained resource: life, mana, stamina. */
const RING_COLORS: Record<DrainResource, number> = {
  hp: 0x86efac,
  mp: 0x93c5fd,
  sp: 0xfde047,
};
/** A drainer pulses at most once per this many ms, so fast hits don't spam rings. */
const RING_COOLDOWN_MS = 500;
const lastRing = new WeakMap<Player, number>();
/** The ring grows to this radius, in pixels. */
const RING_RADIUS = 9;
const RING_MS = 220;

/**
 * A thin ring of the drained resource's color pulses out of the drainer's body. Visual only; any
 * drain (steal stats, a future drain-over-time buff) can play it.
 */
export function playDrainRing(target: Player | undefined, resource: DrainResource) {
  const scene = target?.scene;
  if (!scene || target.state?.isDead) return;
  /* Don't give away a stealthed drainer */
  if (!target.visible || target.alpha === 0) return;
  const now = scene.time.now;
  if (now - (lastRing.get(target) ?? -Infinity) < RING_COOLDOWN_MS) return;
  lastRing.set(target, now);

  const ring = scene.add
    .circle(0, target.bodyCenterY, RING_RADIUS)
    .setStrokeStyle(1, RING_COLORS[resource], 0.8)
    .setScale(0.3);
  target.add(ring);
  scene.tweens.add({
    targets: ring,
    scale: 1,
    alpha: 0,
    duration: RING_MS,
    ease: "Quad.easeOut",
    onComplete: () => ring.destroy(),
  });
}
