import type { MirrorCharacter } from "@/network/session/mirror";
import { STAND_STILL, type Brain } from "./brain";

/** How close, beyond both bodies, the bot walks before swinging. */
const SWING_RANGE = 12;

const isAlive = (c: MirrorCharacter) => !c.state?.isDead && (c.vitals?.hp ?? 1) > 0;

/** Walks to the nearest living npc in its room and attacks it. */
export const grind: Brain = ({ mirror, self }) => {
  let target: MirrorCharacter | undefined;
  let best = Infinity;
  for (const npc of mirror.npcs.values()) {
    if (!isAlive(npc) || (npc.roomName && npc.roomName !== mirror.roomName)) continue;
    const d = Math.hypot(npc.x - self.x, npc.y - self.y);
    if (d < best) {
      best = d;
      target = npc;
    }
  }
  if (!target) return STAND_STILL;
  const dx = target.x - self.x;
  const dy = target.y - self.y;
  const angle = Math.atan2(dy, dx);
  const reach = (self.bodySize ?? 0) + (target.bodySize ?? 0) + SWING_RANGE;
  if (best <= reach) return { move: { x: 0, y: 0 }, attack: { angle } };
  return { move: { x: dx / best, y: dy / best } };
};
