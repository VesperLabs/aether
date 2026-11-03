import type { TileMap } from "@/rules/movement/tilemap";
import {
  createPlayerInputThrottle,
  crowdAround,
  getHeroStep,
  nextPlayerInput,
  type PlayerInputPayload,
  type PlayerInputThrottle,
} from "./hero-control";
import { stepHeroThroughMap } from "./hero-motion";

interface Vector {
  x: number;
  y: number;
}

const STILL: Vector = { x: 0, y: 0 };

/** What carries over between frames of driving one hero. */
export interface HeroDrive {
  /** Last frame's velocity, crowd drift included. */
  velocity: Vector;
  /** Last frame's crowd drift, taken back out before easing. */
  crowdPush: Vector;
  /** True when the hero stood still last frame. */
  isIdle: boolean;
  throttle: PlayerInputThrottle;
}

export function createHeroDrive(): HeroDrive {
  return { velocity: STILL, crowdPush: STILL, isIdle: true, throttle: createPlayerInputThrottle() };
}

/** One frame of what the player (or a bot's brain) wants, and what is around the hero. */
export interface HeroFrame {
  hero: { id: string; x: number; y: number; bodySize: number; roomName: string; walkSpeed: number };
  /** The room's walls; without them the hero stays put. */
  map: TileMap | undefined;
  /** Who is nearby: mobs block the hero, other players push it gently. */
  crowd: Parameters<typeof crowdAround>[1];
  /** Velocity of a knockback in progress. It takes over and is sent unthrottled. */
  shove?: Vector;
  keys?: Vector;
  stick?: Vector;
  /** Attacking or aiming roots the hero to a fraction of walk speed. */
  isRooted?: boolean;
  rollAngle?: number;
  lungeAngle?: number;
  /** The way the hero faces this frame, as sent to the server. */
  direction: string;
  isEnteringDoor?: boolean;
  /** Sends this frame's input now (a roll and the frame after it). */
  unthrottled?: boolean;
  seconds: number;
  now: number;
}

export interface HeroFrameResult {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** The `playerInput` to send this frame, if one is due. */
  input?: PlayerInputPayload;
}

/**
 * Drives the hero one frame: velocity from intent (or a shove), crowd drift and mobs, the walls,
 * and the throttled `playerInput`. The browser and bots both move their hero only through this,
 * so they move the same way and the server accepts both.
 */
export function driveHero(drive: HeroDrive, frame: HeroFrame): HeroFrameResult {
  const { hero, seconds } = frame;
  let vx: number;
  let vy: number;
  if (frame.shove) {
    ({ x: vx, y: vy } = frame.shove);
    drive.crowdPush = STILL;
  } else {
    const isDashing = frame.rollAngle !== undefined || frame.lungeAngle !== undefined;
    const step = getHeroStep({
      keys: frame.keys ?? STILL,
      stick: frame.stick,
      walkSpeed: hero.walkSpeed,
      isRooted: !!frame.isRooted,
      rollAngle: frame.rollAngle,
      lungeAngle: frame.lungeAngle,
      current: drive.velocity,
      lastCrowdPush: drive.crowdPush,
      seconds,
      self: hero,
      neighbours: isDashing ? [] : crowdAround(hero, frame.crowd),
    });
    ({ vx, vy } = step);
    drive.crowdPush = step.crowdPush;
  }

  const moved = frame.map
    ? stepHeroThroughMap(
        frame.map,
        { x: hero.x, y: hero.y, vx, vy, bodySize: hero.bodySize },
        seconds,
      )
    : hero;
  drive.velocity = { x: vx, y: vy };

  const isStill = vx === 0 && vy === 0;
  const input = nextPlayerInput(
    drive.throttle,
    {
      x: moved.x,
      y: moved.y,
      roomName: hero.roomName,
      /* Still for two frames: the frame it stopped on is still sent, so the server sees the stop */
      isIdle: drive.isIdle && isStill,
      isEnteringDoor: !!frame.isEnteringDoor,
    },
    vx,
    vy,
    frame.direction,
    frame.now,
    !!frame.unthrottled || !!frame.shove,
  );
  drive.isIdle = isStill;
  return { x: moved.x, y: moved.y, vx, vy, input };
}
