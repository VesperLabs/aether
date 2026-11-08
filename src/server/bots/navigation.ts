import { findPath, moveBodyThroughMap } from "@/rules/movement";
import { getStickyDirection, type Point, type System } from "@/rules/world";
import type { PlayerInRoom } from "@/server/player-room";
import type { ServerWorld } from "@/server/server-world";
import type { Bot } from "./bot";

/** Close enough to a waypoint to head for the next one, px. */
const WAYPOINT_REACHED = 3;
/** Going this long without getting closer to the next waypoint means stuck, ms. */
const STUCK_MS = 1500;
/** Getting this much closer counts as progress, px. */
const PROGRESS_STEP = 2;
/** A long stall (debugger, GC) must not teleport bots across the map. */
const MAX_STEP_MS = 100;

/**
 * Starts walking to `to` along a path around the walls. Asking for the walk already under way
 * changes nothing. No path marks the walk blocked, which the bot sees and gives up on.
 */
export function startWalk(world: ServerWorld, bot: Bot, player: PlayerInRoom, to: Point) {
  const current = bot.walk;
  if (current?.to.x === to.x && current.to.y === to.y && current.roomName === player.roomName) {
    return;
  }
  const path = findPath(player.room.pathfinder, player, to);
  bot.walk = {
    roomName: player.roomName,
    to,
    /* The path ends on the centre of the last tile; finish on the exact spot */
    path: path ? [...path.slice(0, -1), to] : [],
    status: path ? "walking" : "blocked",
    progressAt: world.now(),
    bestDistance: Infinity,
  };
  if (!path) stopWalk(bot, player);
}

/** Stops where it stands. */
export function stopWalk(bot: Bot, player: PlayerInRoom) {
  if (bot.walk?.status === "walking") bot.walk = null;
  player.vx = 0;
  player.vy = 0;
}

/** Steps every walking bot along its path. Runs every tick, between thinks. */
export const moveBots: System<ServerWorld> = (world, { delta }) => {
  const seconds = Math.min(delta, MAX_STEP_MS) / 1000;
  const now = world.now();
  for (const bot of Object.values(world.bots)) {
    const player = world.players[bot.id];
    const walk = bot.walk;
    if (bot.isPaused || !walk || walk.status !== "walking" || !player?.room || player.state?.isDead)
      continue;
    /* A door or respawn moved it to another room: that walk is over */
    if (walk.roomName !== player.roomName) {
      bot.walk = null;
      continue;
    }
    step(walk, player as PlayerInRoom, now);
    if (walk.status === "walking") moveBodyThroughMap(player.room.map, player, seconds);
  }
};

/** Aims the body at the next waypoint, and notes arriving or getting stuck. */
function step(walk: NonNullable<Bot["walk"]>, player: PlayerInRoom, now: number) {
  let next = walk.path[0];
  while (next && Math.hypot(next.x - player.x, next.y - player.y) <= WAYPOINT_REACHED) {
    walk.path.shift();
    walk.bestDistance = Infinity;
    walk.progressAt = now;
    next = walk.path[0];
  }
  if (!next) return halt(walk, player, "arrived");

  const distance = Math.hypot(next.x - player.x, next.y - player.y);
  if (distance < walk.bestDistance - PROGRESS_STEP) {
    walk.bestDistance = distance;
    walk.progressAt = now;
  } else if (now - walk.progressAt > STUCK_MS) {
    return halt(walk, player, "blocked");
  }

  const speed = player.stats?.walkSpeed ?? 0;
  player.vx = ((next.x - player.x) / distance) * speed;
  player.vy = ((next.y - player.y) / distance) * speed;
  player.direction = getStickyDirection(player.direction, player, next);
}

function halt(walk: NonNullable<Bot["walk"]>, player: PlayerInRoom, status: "arrived" | "blocked") {
  walk.status = status;
  player.vx = 0;
  player.vy = 0;
}
