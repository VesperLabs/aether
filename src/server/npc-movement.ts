import type { Npc } from "./npc";
import type { ServerCharacter } from "./character";
import { getRoomIndex } from "./room-index";
import {
  arrive,
  checkInRange,
  decideTalkingEnded,
  fleeAround,
  leadNpcChase,
  NPC_CHASE_SPEED_RATIO,
  NPC_STRAFE_SPEED_RATIO,
  seek,
  separate,
  steerWithSeparation,
  strafeAround,
  type NpcMovement,
  type Velocity,
} from "@/rules/npc-behavior";
import {
  findNextWaypoint,
  getKnockbackVelocity,
  getLungeVelocity,
  hasLineOfSight,
  isOutOfMap,
} from "@/rules/movement";
import { getCharacterDirection, getStickyDirection, type Point } from "@/rules/world";

/** NPCs closer than this push apart while walking, so packs spread out instead of stacking. */
const NPC_SEPARATION_RADIUS = 20;
/** How hard that push steers, as a share of walk speed. */
const NPC_SEPARATION_STRENGTH = 0.6;

/** How long, in ms, an NPC keeps a new facing before it may turn again, so it never jitters. */
const FACING_HOLD_MS = 250;
/** When each NPC last turned. */
const turnedAt = new WeakMap<Npc, number>();

/** Turns the NPC toward `point`, unless it turned too recently or the point barely differs. */
function face(npc: Npc, point: Point) {
  const next = getStickyDirection(npc.direction, npc, point);
  if (next === npc.direction) return;
  const now = npc.world.now();
  const last = turnedAt.get(npc);
  if (last !== undefined && now - last < FACING_HOLD_MS) return;
  npc.direction = next;
  turnedAt.set(npc, now);
}

/** Carries out the movement the behavior rules chose, as velocity and facing on the NPC. */
export function performNpcMovement(
  npc: Npc,
  movement: NpcMovement,
  targetPlayer: ServerCharacter | undefined,
  leader: Point | null | undefined,
) {
  switch (movement.type) {
    case "standStill":
      return standStill(npc);
    case "chase": {
      if (!targetPlayer) return standStill(npc);
      // Shifted by its aim, so a swinging hand (not its body) arrives on the target
      const { x: ax, y: ay } = movement.aim ?? { x: 0, y: 0 };
      const target = { ...targetPlayer, x: targetPlayer.x + ax, y: targetPlayer.y + ay };
      // In the open it heads where the target is going; around walls, straight for them. Lining
      // up a swing, it eases onto its spot instead of overshooting into the target's body.
      if (movement.pathed) return walkToPathed(npc, target, NPC_CHASE_SPEED_RATIO);
      const lead = leadNpcChase(npc, target, walkSpeedOf(npc));
      return walkTo(npc, lead, NPC_CHASE_SPEED_RATIO, !!movement.aim);
    }
    case "returnToSpawn":
      return movement.pathed ? walkToPathed(npc, npc.home()) : walkTo(npc, npc.home());
    case "walkTo":
      return movement.pathed ? walkToPathed(npc, movement.to) : walkTo(npc, movement.to);
    case "follow":
      if (!leader) return standStill(npc);
      // Around any wall in the way: walking straight at it and only pathing once pressed against
      // it flips between the two every few ticks, which is the wiggle
      return movement.pathed || !hasLineOfSight(npc.room.map.grid, npc, leader)
        ? walkToPathed(npc, leader)
        : walkTo(npc, leader);
    case "flee":
      if (movement.retreatAt !== undefined) npc.state.retreatAt = movement.retreatAt;
      if (!targetPlayer) return standStill(npc);
      return steer(
        npc,
        fleeAround(
          npc,
          targetPlayer,
          npc.stats.walkSpeed * (movement.speedRatio ?? 1),
          (point) => isOutOfMap(npc.movementMap(), point.x, point.y),
          { vx: npc.vx, vy: npc.vy },
          npc.bodySize,
        ),
      );
    case "lunge": {
      // Straight along the aim: no separation pushing it off the line the player is dodging
      const { x: vx, y: vy } = getLungeVelocity(movement.angle);
      npc.vx = vx;
      npc.vy = vy;
      npc.direction = getCharacterDirection(npc, { x: npc.x + vx, y: npc.y + vy });
      return;
    }
    case "knockback": {
      // Shoved straight back, still facing the way it was
      const { x: vx, y: vy } = getKnockbackVelocity(movement.angle, movement.elapsed);
      npc.vx = vx;
      npc.vy = vy;
      return;
    }
    case "strafe":
      if (!targetPlayer) return standStill(npc);
      return strafe(npc, targetPlayer, movement);
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

/**
 * Sets `base` as the velocity, pushed apart from nearby NPCs, and faces the way it means to go:
 * the push is a shove, not a heading, and turning with it spins a crowd on a diagonal. `facing`
 * overrides where it looks (a strafer watches its target).
 */
function steer(npc: Npc, base: Velocity, facing?: Point) {
  const neighbors = getRoomIndex(npc.world, npc.room.name).npcs.near(npc, NPC_SEPARATION_RADIUS);
  const { vx, vy } = steerWithSeparation(
    base,
    separate(npc, neighbors, NPC_SEPARATION_RADIUS),
    npc.stats.walkSpeed * NPC_SEPARATION_STRENGTH,
  );
  npc.vx = vx;
  npc.vy = vy;
  face(npc, facing ?? { x: npc.x + base.vx, y: npc.y + base.vy });
}

/**
 * Sidesteps around `target`, facing it, drifting back toward `distance` from it so it stays in
 * range, and switches sides when a wall would block its path or its shot.
 */
function strafe(
  npc: Npc,
  target: Point,
  {
    clockwise,
    distance,
    nextStrafeAt,
  }: { clockwise: boolean; distance: number; nextStrafeAt?: number },
) {
  if (nextStrafeAt !== undefined) npc.state.nextStrafeAt = nextStrafeAt;
  const speed = npc.stats.walkSpeed * NPC_STRAFE_SPEED_RATIO;
  // A step into a wall, or one that puts a wall between it and the target, counts as blocked
  const isBlocked = ({ vx, vy }: Velocity) => {
    const ahead = (npc.bodySize + 16) / speed;
    const next = { x: npc.x + vx * ahead, y: npc.y + vy * ahead };
    return (
      isOutOfMap(npc.movementMap(), next.x, next.y) ||
      !hasLineOfSight(npc.room.map.grid, next, target)
    );
  };
  const step = strafeAround(npc, target, { clockwise, distance, speed }, isBlocked);
  npc.state.strafeClockwise = step.clockwise;
  steer(npc, step.velocity, target);
}

/** Walks straight to `coords` at `speedRatio` of its walk speed. */
/** Walks to `coords`; `arriving` slows down to stop there (see `arrive`). */
function walkTo(npc: Npc, coords: Point, speedRatio = 1, arriving = false) {
  const speed = walkSpeedOf(npc) * speedRatio;
  steer(npc, arriving ? arrive(npc, coords, speed) : seek(npc, coords, speed));
}

/** How fast it walks: a companion keeps pace with its owner, so it never falls behind. */
function walkSpeedOf(npc: Npc) {
  return npc.owner()?.stats.walkSpeed ?? npc.stats.walkSpeed;
}

/** Walks to the next tile on the way to `target`, found on the tick before. */
function walkToPathed(npc: Npc, target: Point, speedRatio = 1) {
  /* Paths are laid for walkers; a swimmer heads straight there and stops at the bank */
  if (npc.habitat === "water") return walkTo(npc, target, speedRatio);
  const { nextPath } = npc;
  const next = findNextWaypoint(npc.room.pathfinder, npc, target);
  if (next?.x !== nextPath?.x || next?.y !== nextPath?.y) npc.nextPath = next as Point;
  // No way around (the target stands in a wall, or past the search limit): head straight for it
  if (!next) return walkTo(npc, target, speedRatio);
  if (nextPath) {
    walkTo(npc, nextPath, speedRatio);
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
