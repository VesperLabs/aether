import { NPC_LAND_DRIFT_RATIO, NPC_LAND_SETTLE_MS } from "./constants";
import type { NpcMovement } from "./movement";

/**
 * A bird touching down: it keeps going the way it flew, at a share of its flight speed (never
 * faster than it walks), until it settles and wanders on.
 */
export function landingDrift(
  npc: { vx?: number; vy?: number; stats?: { walkSpeed?: number } | null },
  time: number,
): NpcMovement {
  const vx = npc.vx ?? 0;
  const vy = npc.vy ?? 0;
  const speed = Math.hypot(vx, vy);
  const keep = speed ? Math.min(NPC_LAND_DRIFT_RATIO, (npc.stats?.walkSpeed ?? speed) / speed) : 0;
  return { type: "wander", vx: vx * keep, vy: vy * keep, nextWanderAt: time + NPC_LAND_SETTLE_MS };
}
