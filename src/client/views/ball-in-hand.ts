import type { Point } from "@/rules/world";
import { ballFrameOf } from "./ball-sheet";
import type { Player } from "./player";

/**
 * A ball held out to throw, from the synced `aimingBall`, so everyone sees it. Thrown, it stays in
 * the hand until its flight shows up and takes it (`takeHeldBall`), so the throw looks continuous;
 * if no flight comes, it is put away after a moment.
 */
const RELEASE_WAIT_MS = 400;
/** When a ball no longer aimed is put away, if no flight has taken it. */
const releases = new WeakMap<Player, number>();

/** The frame of the ball in the right hand, or undefined when none is held. */
export function heldBallFrame(p: Player) {
  const frame = ballFrameOf(p.state.aimingBall ?? undefined);
  if (frame === undefined || p.state.isAiming) {
    releases.delete(p);
    return frame;
  }
  const now = p.scene.time.now;
  const until = releases.get(p) ?? now + RELEASE_WAIT_MS;
  releases.set(p, until);
  if (now < until) return frame;
  takeHeldBall(p);
  return undefined;
}

/** Takes the ball out of the hand as its flight starts: where it was in the world, if one was held. */
export function takeHeldBall(p: Player): Point | undefined {
  if (!p.state.aimingBall) return undefined;
  p.state.aimingBall = null;
  releases.delete(p);
  const { tx, ty } = p.handRight.getWorldTransformMatrix();
  return { x: tx, y: ty };
}
