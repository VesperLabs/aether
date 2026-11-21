import type { CardinalDirection, Point } from "@/rules/world";
import type { WanderStep } from "./wander";

/** How an NPC moves this tick, as its chosen behavior describes it; the server carries it out. */
export type NpcMovement =
  | { type: "standStill" }
  /** Move toward the target player, pathing around obstacles if `pathed`. */
  | { type: "chase"; pathed: boolean; aim?: { x: number; y: number } }
  | { type: "returnToSpawn"; pathed: boolean }
  /** Walk to a spot, like a guard post. */
  | { type: "walkTo"; to: { x: number; y: number }; pathed: boolean }
  /** Stand at spawn, facing down after `faceDownAfterMs`, or walk back there. */
  | { type: "waitAtSpawn"; faceDownAfterMs: number }
  /** Stand still, turned to face whoever is talking to it. */
  | { type: "talk"; face: CardinalDirection }
  /** Run away from the target (or `from`) around walls, at `speedRatio` of walk speed; sets retreat/scare times. */
  | { type: "flee"; speedRatio?: number; retreatAt?: number }
  /** Get away to `to` at `speedRatio` of walk speed, scared at `scaredAt` (a bird flying off). */
  | { type: "escape"; to: Point; speedRatio: number; scaredAt?: number }
  /** Sidestep around the target, drifting back to `distance` from it. Sets the side and when to next pick one. */
  | { type: "strafe"; clockwise: boolean; distance: number; nextStrafeAt?: number }
  /** Walk to the leader. */
  | { type: "follow"; pathed: boolean }
  | ({ type: "wander" } & WanderStep)
  /** Dash along `angle` (radians): a lunge spell carries it. */
  | { type: "lunge"; angle: number }
  /** Shoved along `angle` (radians), `elapsed` ms in: no turning, no acting. */
  | { type: "knockback"; angle: number; elapsed: number };
