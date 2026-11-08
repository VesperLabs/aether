import type { Npc } from "./npc";
import { getRoomIndex } from "./room-index";

/** How far a follower looks for its leader. Spawns are up to ~900px apart on the peaks. */
const LEADER_SEARCH_RADIUS = 1000;

/** The nearest living NPC named `leaderName` in the follower's room, if any. */
export function findPackLeader(follower: Npc): Npc | null {
  if (!follower.leaderName) return null;
  const npcs = getRoomIndex(follower.world, follower.room.name).npcs.near(
    follower,
    LEADER_SEARCH_RADIUS,
  );
  let leader: Npc | null = null;
  let best = Infinity;
  for (const npc of npcs) {
    if (npc === follower || npc.name !== follower.leaderName) continue;
    const distance = Math.hypot(npc.x - follower.x, npc.y - follower.y);
    if (distance < best) [leader, best] = [npc, distance];
  }
  return leader;
}
