import { encodeWireDirection } from "@/network/sync/net-wire";
import { getDodgeVelocity } from "@/rules/movement/dodge";
import { getKnockbackVelocity } from "@/rules/movement/knockback";
import { getLungeVelocity } from "@/rules/movement/lunge";
import { blockBySolid, getSeparationVelocity, type Neighbour } from "@/rules/movement/separation";
import {
  ATTACK_WALK_SPEED_SCALE,
  approachVelocity,
  getWalkVelocity,
} from "@/rules/movement/walking";

interface Vector {
  x: number;
  y: number;
}

/** Max rate for playerInput while moving (server still gets full x,y,vx,vy snapshots). */
export const PLAYER_INPUT_THROTTLE_MS = 50;

/** Seconds of movement in a frame: capped so a tab coming back from sleep does not jump in one frame. */
export function getFrameSeconds(deltaMs: number) {
  return Math.min(deltaMs, 100) / 1000;
}

/** A move direction held down, with when it was pressed. */
export interface HeldDirection {
  direction: string;
  isDown: boolean;
  timeDown: number;
}

/** The direction of the most recently pressed movement key that is still held. */
export function getLatestHeldDirection(held: Iterable<HeldDirection>) {
  let latest: string | undefined;
  let latestTime = -Infinity;
  for (const key of held) {
    if (key.isDown && key.timeDown > latestTime) {
      latestTime = key.timeDown;
      latest = key.direction;
    }
  }
  return latest;
}

/** Velocity during a shove, `elapsed` ms after it landed. */
export function getShoveStep(angle: number, elapsed: number) {
  const { x: vx, y: vy } = getKnockbackVelocity(angle, elapsed);
  return { vx, vy };
}

/** How near a character must be, per axis, to count for crowd drift and blocking. */
const CROWD_RANGE = 24;

interface CrowdMember {
  id: string;
  x: number;
  y: number;
  state?: { isDead?: boolean };
}

/**
 * The bodies around the hero that drift or block it: other players push gently, mobs are solid.
 * The browser passes its sprites and a bot its client state, so both crowd the same way.
 */
export function crowdAround(
  hero: { id: string; x: number; y: number },
  { npcs, players }: { npcs: Iterable<CrowdMember>; players: Iterable<CrowdMember> },
): Neighbour[] {
  const crowd: Neighbour[] = [];
  for (const [members, isSolid] of [
    [npcs, true],
    [players, false],
  ] as const) {
    for (const c of members) {
      if (c.id === hero.id || c.state?.isDead) continue;
      if (Math.abs(c.x - hero.x) > CROWD_RANGE || Math.abs(c.y - hero.y) > CROWD_RANGE) continue;
      crowd.push({ id: c.id, x: c.x, y: c.y, isSolid });
    }
  }
  return crowd;
}

export interface HeroStepInput {
  /** Walk intent from keys, each axis -1, 0 or 1. */
  keys: Vector;
  /** Analogue walk intent (joystick). Replaces `keys` when non-zero. */
  stick?: Vector;
  walkSpeed: number;
  /** Attacking or aiming roots the hero to a fraction of walk speed. */
  isRooted: boolean;
  /** Angle of a roll in progress. */
  rollAngle?: number;
  /** Angle of a lunge in progress; wins over a roll. */
  lungeAngle?: number;
  /** Last frame's velocity, crowd drift included. */
  current: Vector;
  /** Last frame's crowd drift, taken back out before easing so it stops the moment the hero is clear. */
  lastCrowdPush: Vector;
  seconds: number;
  /** The hero and the bodies near it, for crowd drift. */
  self: Neighbour;
  neighbours: Iterable<Neighbour>;
}

/**
 * The hero's velocity for this frame, the crowd drift to feed back in next frame, and `walk`: the
 * part the player is driving, without drift, which is what the walk animation follows.
 */
export function getHeroStep(input: HeroStepInput) {
  const { walkSpeed } = input;
  let { x: vx, y: vy } = getWalkVelocity(input.keys, walkSpeed);
  if (input.stick && (input.stick.x || input.stick.y)) {
    ({ x: vx, y: vy } = getWalkVelocity(input.stick, walkSpeed));
  }
  if (input.isRooted) {
    vx *= ATTACK_WALK_SPEED_SCALE;
    vy *= ATTACK_WALK_SPEED_SCALE;
  }
  let crowdPush = input.lastCrowdPush;
  if (input.lungeAngle !== undefined) {
    ({ x: vx, y: vy } = getLungeVelocity(input.lungeAngle));
  } else if (input.rollAngle !== undefined) {
    ({ x: vx, y: vy } = getDodgeVelocity(input.rollAngle));
  } else {
    /* Coming out of a roll drops straight to walking pace, so it can't carry past the roll */
    let current = {
      x: input.current.x - input.lastCrowdPush.x,
      y: input.current.y - input.lastCrowdPush.y,
    };
    const speed = Math.hypot(current.x, current.y);
    if (speed > walkSpeed) {
      current = { x: (current.x / speed) * walkSpeed, y: (current.y / speed) * walkSpeed };
    }
    ({ x: vx, y: vy } = approachVelocity(current, { x: vx, y: vy }, walkSpeed, input.seconds));
    const walk = { x: vx, y: vy };
    const neighbours = [...input.neighbours];
    crowdPush = getSeparationVelocity(input.self, neighbours, walkSpeed, walk);
    ({ x: vx, y: vy } = blockBySolid(input.self, neighbours, {
      x: vx + crowdPush.x,
      y: vy + crowdPush.y,
    }));
    return { vx, vy, crowdPush, walk };
  }
  return { vx, vy, crowdPush, walk: { x: vx, y: vy } };
}

/** The playerInput command, as the server's zod schema takes it. */
export interface PlayerInputPayload {
  vx: number;
  vy: number;
  x: number;
  y: number;
  d: number;
  roomName?: string;
}

/** What was last sent, to decide when the next playerInput can wait. */
export interface PlayerInputThrottle {
  lastEmitAt: number;
  lastEmitted: (Required<PlayerInputPayload> & { roomName: string }) | null;
}

export function createPlayerInputThrottle(): PlayerInputThrottle {
  return { lastEmitAt: 0, lastEmitted: null };
}

export interface PlayerInputHero {
  x: number;
  y: number;
  roomName: string;
  isIdle?: boolean;
  isEnteringDoor?: boolean;
}

/**
 * The playerInput to send now, or undefined, throttled while the input is unchanged. Updates
 * `throttle` when it returns one. `unthrottled` sends it now: during a roll the hero covers a
 * melee range between throttled updates.
 */
export function nextPlayerInput(
  throttle: PlayerInputThrottle,
  hero: PlayerInputHero,
  vx: number,
  vy: number,
  direction: string,
  now: number,
  unthrottled = false,
): PlayerInputPayload | undefined {
  /* If the hero is standing still do not update the server */
  if (hero.isIdle || hero.isEnteringDoor) return;
  const last = throttle.lastEmitted;
  const d = encodeWireDirection(direction);
  const payload: PlayerInputPayload = {
    vx: Math.round(vx),
    vy: Math.round(vy),
    x: Math.round(hero.x),
    y: Math.round(hero.y),
    d,
  };
  if (!last || last.roomName !== hero.roomName) payload.roomName = hero.roomName;
  const stopped = vx === 0 && vy === 0;
  const wasMoving = last && (last.vx !== 0 || last.vy !== 0);
  const flushNow =
    unthrottled ||
    !last ||
    (stopped && wasMoving) ||
    last.d !== d ||
    last.roomName !== hero.roomName ||
    now - throttle.lastEmitAt >= PLAYER_INPUT_THROTTLE_MS;
  if (!flushNow) return;
  throttle.lastEmitAt = now;
  throttle.lastEmitted = {
    vx: payload.vx,
    vy: payload.vy,
    x: payload.x,
    y: payload.y,
    d: payload.d,
    roomName: hero.roomName,
  };
  return payload;
}
