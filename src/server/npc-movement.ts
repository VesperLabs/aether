import type { Npc } from "./npc";
import type { Player } from "./player";
import { getRoomIndex } from "./room-index";
import {
  checkInRange,
  decideTalkingEnded,
  flee,
  seek,
  separate,
  steerWithSeparation,
  type NpcMovement,
  type Velocity,
} from "@/rules/npc-behavior";
import { findNextWaypoint } from "@/rules/movement";
import { getStickyDirection, type Point } from "@/rules/world";

/** NPCs closer than this push apart while walking, so packs spread out instead of stacking. */
const NPC_SEPARATION_RADIUS = 20;
/** How hard that push steers, as a share of walk speed. */
const NPC_SEPARATION_STRENGTH = 0.6;

/** Carries out the movement the behavior rules chose, as velocity and facing on the NPC. */
export function performNpcMovement(
  npc: Npc,
  movement: NpcMovement,
  targetPlayer: Player | undefined,
  leader: Point | null | undefined,
) {
  switch (movement.type) {
    case "standStill":
      return standStill(npc);
    case "chase":
      if (!targetPlayer) return standStill(npc);
      return movement.pathed ? walkToPathed(npc, targetPlayer) : walkTo(npc, targetPlayer);
    case "returnToSpawn":
      return movement.pathed ? walkToPathed(npc, npc.home()) : walkTo(npc, npc.home());
    case "follow":
      if (!leader) return standStill(npc);
      return movement.pathed ? walkToPathed(npc, leader) : walkTo(npc, leader);
    case "flee":
      if (!targetPlayer) return standStill(npc);
      return steer(npc, flee(npc, targetPlayer, npc.stats.walkSpeed));
    case "waitAtSpawn":
      npc.timers.after(movement.faceDownAfterMs, () => {
        npc.direction = "down";
      });
      return standStill(npc);
    case "talk":
      return checkTalking(npc);
    case "wander": {
      const { type: _type, nextWanderAt, ...change } = movement;
      if (nextWanderAt !== undefined) npc.state.nextWanderAt = nextWanderAt;
      Object.assign(npc, change);
      return;
    }
  }
}

/** Sets `base` as the velocity, pushed apart from nearby NPCs, and faces the way it moves. */
function steer(npc: Npc, base: Velocity) {
  const neighbors = getRoomIndex(npc.world, npc.room.name).npcs.near(npc, NPC_SEPARATION_RADIUS);
  const { vx, vy } = steerWithSeparation(
    base,
    separate(npc, neighbors, NPC_SEPARATION_RADIUS),
    npc.stats.walkSpeed * NPC_SEPARATION_STRENGTH,
  );
  npc.vx = vx;
  npc.vy = vy;
  npc.direction = getStickyDirection(npc.direction, npc, { x: npc.x + vx, y: npc.y + vy });
}

export function walkTo(npc: Npc, coords: Point) {
  steer(npc, seek(npc, coords, npc.stats.walkSpeed));
}

/** Walks to the next tile on the way to `target`, found on the tick before. */
function walkToPathed(npc: Npc, target: Point) {
  const { nextPath } = npc;
  const next = findNextWaypoint(npc.room.pathfinder, npc, target);
  if (next?.x !== nextPath?.x || next?.y !== nextPath?.y) npc.nextPath = next as Point;
  if (nextPath) {
    walkTo(npc, nextPath);
    if (checkInRange(npc, nextPath, 1)) {
      /* Cleared with null; the shared model types it as always set. */
      npc.nextPath = null as unknown as Point;
    }
  }
}

function standStill(npc: Npc) {
  npc.vx = 0;
  npc.vy = 0;
}

/** Stands still for its talkers, and stops talking to anyone who walked off. */
function checkTalking(npc: Npc) {
  standStill(npc);
  const ended = decideTalkingEnded(npc, npc.talkingIds, (id) => npc.world?.players?.[id]);
  for (const playerId of ended) {
    const index = npc.talkingIds.indexOf(playerId);
    if (index !== -1) npc.talkingIds.splice(index, 1);
  }
}
