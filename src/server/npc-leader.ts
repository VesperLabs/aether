import { findPath, hasLineOfSight } from "@/rules/movement";
import type { Point } from "@/rules/world";
import type { Npc } from "./npc";
import { getRoomIndex } from "./room-index";

/*
 * Who an NPC follows, one rule for pets and packs: a companion follows its owner
 * (`state.ownerId`); a pack follower (a `leader` map property naming an actor) follows the
 * nearest living one of those it can walk to, and sticks with it until it dies or leaves.
 */

/** How far a follower looks for its leader. Spawns are up to ~900px apart on the peaks. */
const LEADER_SEARCH_RADIUS = 1000;

/** The pack leader each follower is walking with. */
const packLeaders = new WeakMap<Npc, Npc>();
/** The spawn of the last pack leader it had, so the pack keeps its home if the leader dies. */
const packHomes = new WeakMap<Npc, Point>();

/** Who `npc` follows right now, if anyone. */
export function findLeader(npc: Npc): Point | null {
  if (npc.state.ownerId) return npc.owner() ?? null;
  return findPackLeader(npc);
}

/** Where it leashes to and walks back to: its owner, its pack's home, else its own spawn. */
export function homeOf(npc: Npc): Point {
  const owner = npc.owner();
  if (owner) return { x: owner.x, y: owner.y };
  return packHomes.get(npc) ?? npc.startingCoords;
}

function findPackLeader(follower: Npc): Npc | null {
  if (!follower.leaderName) return null;
  const current = packLeaders.get(follower);
  if (current && isLeaderFor(follower, current)) return current;
  packLeaders.delete(follower);

  /* A leader across a wall or water it can't get around is no leader: it keeps to its home */
  const leader =
    getRoomIndex(follower.world, follower.room.name)
      .npcs.near(follower, LEADER_SEARCH_RADIUS)
      .filter((npc) => isLeaderFor(follower, npc))
      .map((npc) => ({ npc, distance: Math.hypot(npc.x - follower.x, npc.y - follower.y) }))
      .sort((a, b) => a.distance - b.distance)
      .find(({ npc }) => canReach(follower, npc))?.npc ?? null;
  if (leader) {
    packLeaders.set(follower, leader);
    packHomes.set(follower, leader.startingCoords);
  }
  return leader;
}

function isLeaderFor(follower: Npc, npc: Npc) {
  return (
    npc !== follower &&
    npc.name === follower.leaderName &&
    !npc.state.isDead &&
    npc.room?.name === follower.room.name
  );
}

function canReach(follower: Npc, leader: Npc) {
  const { map, pathfinder } = follower.room;
  return hasLineOfSight(map.grid, follower, leader) || !!findPath(pathfinder, follower, leader);
}
