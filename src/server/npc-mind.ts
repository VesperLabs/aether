import { botPersonalities, type BotPersonalityId } from "@/content";
import {
  createBotMemory,
  thinkBot,
  type BotIntent,
  type BotMemory,
  type BotView,
} from "@/rules/bots";
import { findPath } from "@/rules/movement";
import { createRng, getStickyDirection, seedFromString, type Point, type Rng } from "@/rules/world";
import type { Npc } from "./npc";

/*
 * A mind: the planning brain from `rules/bots`, running on an NPC's body in place of its behaviors.
 * The brain only sees plain data (`BotView`) and answers with intents; this file carries them out.
 */

/** Close enough to a waypoint to head for the next one, px. */
const WAYPOINT_REACHED = 3;
/** Going this long without getting closer to the next waypoint means stuck, ms. */
const STUCK_MS = 1500;
/** Getting this much closer counts as progress, px. */
const PROGRESS_STEP = 2;

/** A walk in progress: the path to follow, and how it is going. */
interface MindWalk {
  roomName: string;
  to: Point;
  /** Waypoints still ahead, the destination last. */
  path: Point[];
  status: "walking" | "arrived" | "blocked";
  /** When it last got noticeably closer to its next waypoint, to tell when it is stuck. */
  progressAt: number;
  /** The closest it has been to its next waypoint. */
  bestDistance: number;
}

/** What an NPC with a mind remembers. */
export interface NpcMind {
  personality: BotPersonalityId;
  memory: BotMemory;
  /** Its own seeded rolls, so its choices replay the same. */
  rng: Rng;
  walk: MindWalk | null;
}

export function createMind(npc: Npc, personality: BotPersonalityId): NpcMind {
  const rng = createRng(seedFromString(`mind-${npc.id}`));
  return { personality, rng, memory: createBotMemory(npc.world.now(), rng), walk: null };
}

/** One tick of a minded NPC: step along its walk, then think and act. */
export function runMind(npc: Npc, mind: NpcMind) {
  const now = npc.world.now();
  if (mind.walk && mind.walk.roomName !== npc.room.name) mind.walk = null;
  if (mind.walk?.status === "walking") stepWalk(npc, mind.walk, now);

  const { memory, intents } = thinkBot({
    view: perceive(npc, mind, now),
    memory: mind.memory,
    personality: botPersonalities[mind.personality],
    rng: mind.rng,
  });
  mind.memory = memory;
  for (const intent of intents) act(npc, mind, intent);
}

/** Copies what the brain can see out of the live NPC into plain data. */
function perceive(npc: Npc, mind: NpcMind, now: number): BotView {
  return {
    now,
    self: {
      id: npc.id,
      roomName: npc.room.name,
      x: npc.x,
      y: npc.y,
      hp: npc.stats?.hp ?? 0,
      maxHp: npc.stats?.maxHp ?? 0,
      isDead: !!npc.state.isDead,
      home: npc.startingCoords,
      walk: mind.walk && { to: mind.walk.to, status: mind.walk.status },
    },
  };
}

/** Carries out an intent. NPCs come back to life on their own, so `respawn` needs nothing. */
function act(npc: Npc, mind: NpcMind, intent: BotIntent) {
  switch (intent.type) {
    case "stop":
      return stopWalk(npc, mind);
    case "walkTo":
      return startWalk(npc, mind, intent.to);
    case "respawn":
      return;
  }
}

/**
 * Starts walking to `to` along a path around the walls. Asking for the walk already under way
 * changes nothing. No path marks the walk blocked, which the brain sees and gives up on.
 */
function startWalk(npc: Npc, mind: NpcMind, to: Point) {
  const current = mind.walk;
  if (current?.to.x === to.x && current.to.y === to.y && current.roomName === npc.room.name) return;
  const path = findPath(npc.room.pathfinder, npc, to);
  mind.walk = {
    roomName: npc.room.name,
    to,
    /* The path ends on the centre of the last tile; finish on the exact spot */
    path: path ? [...path.slice(0, -1), to] : [],
    status: path ? "walking" : "blocked",
    progressAt: npc.world.now(),
    bestDistance: Infinity,
  };
  if (!path) stopWalk(npc, mind);
}

/** Stops where it stands. */
function stopWalk(npc: Npc, mind: NpcMind) {
  if (mind.walk?.status === "walking") mind.walk = null;
  npc.vx = 0;
  npc.vy = 0;
}

/** Aims the body at the next waypoint, and notes arriving or getting stuck. The tick moves it. */
function stepWalk(npc: Npc, walk: MindWalk, now: number) {
  let next = walk.path[0];
  while (next && Math.hypot(next.x - npc.x, next.y - npc.y) <= WAYPOINT_REACHED) {
    walk.path.shift();
    walk.bestDistance = Infinity;
    walk.progressAt = now;
    next = walk.path[0];
  }
  if (!next) return halt(npc, walk, "arrived");

  const distance = Math.hypot(next.x - npc.x, next.y - npc.y);
  if (distance < walk.bestDistance - PROGRESS_STEP) {
    walk.bestDistance = distance;
    walk.progressAt = now;
  } else if (now - walk.progressAt > STUCK_MS) {
    return halt(npc, walk, "blocked");
  }

  const speed = npc.stats?.walkSpeed ?? 0;
  npc.vx = ((next.x - npc.x) / distance) * speed;
  npc.vy = ((next.y - npc.y) / distance) * speed;
  npc.direction = getStickyDirection(npc.direction, npc, next);
}

function halt(npc: Npc, walk: MindWalk, status: "arrived" | "blocked") {
  walk.status = status;
  npc.vx = 0;
  npc.vy = 0;
}
