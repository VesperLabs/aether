import { STRUGGLE_MS, rollCatch, type ThrowFlight } from "@/rules/capture";
import type { Point, System } from "@/rules/world";
import type { BallEffectWire, EffectOutcome, EffectSource } from "@/network";
import { catchAsCompanion } from "./catching";
import { canTame } from "./companions";
import type { Npc } from "./npc";
import { isInRoom } from "./player-room";
import type { ServerWorld } from "./server-world";

/** How long a ball that hit nothing lies where it fell before it is gone, in ms. */
const LIE_MS = 450;

/**
 * A thrown ball, as the world keeps it: an effect (`sync/effects`) that lives until its struggle
 * ends, whoever is watching and wherever its thrower goes. It is rolled only when it ends, so no
 * client knows the outcome early.
 */
export interface Ball extends EffectSource {
  id: string;
  room: Room;
  throwerId: string;
  texture: string;
  from: Point;
  to: Point;
  flightMs: number;
  target?: Npc;
  startedAt: number;
  /** When it is decided: caught or broken free on a creature, gone on the ground. */
  endsAt: number;
}

/** Puts a thrown ball in the world and shows it to the room. */
export function throwBall(
  world: ServerWorld,
  {
    room,
    throwerId,
    texture,
    from,
    flight,
  }: Pick<Ball, "room" | "throwerId" | "texture" | "from"> & {
    flight: ThrowFlight<Npc>;
  },
) {
  const startedAt = world.now();
  const ball: Ball = {
    id: world.dice.newId(),
    room,
    throwerId,
    texture,
    from,
    to: flight.to,
    flightMs: flight.flightMs,
    target: flight.target,
    startedAt,
    endsAt: startedAt + flight.flightMs + (flight.target ? STRUGGLE_MS : LIE_MS),
    toEffect: (now) => toBallEffect(ball, now),
  };
  world.balls[ball.id] = ball;
  world.io.to(room.name).emit("effectStarted", ball.toEffect(startedAt) as BallEffectWire);
}

function toBallEffect(ball: Ball, now: number): BallEffectWire {
  return {
    kind: "ball",
    id: ball.id,
    ageMs: now - ball.startedAt,
    throwerId: ball.throwerId,
    texture: ball.texture,
    from: ball.from,
    to: ball.to,
    flightMs: ball.flightMs,
    targetId: ball.target?.id,
    struggleMs: STRUGGLE_MS,
  };
}

/** Each tick: balls whose time is up are decided, and leave the world. */
export const resolveBalls: System<ServerWorld> = (world) => {
  const now = world.now();
  for (const ball of Object.values(world.balls)) {
    if (now < ball.endsAt) continue;
    delete world.balls[ball.id];
    endBall(world, ball, decide(world, ball));
  }
};

/**
 * Whether its creature is caught: still there and tameable, its thrower still in the game, and the
 * roll goes their way. A ball on the ground is just done.
 */
function decide(world: ServerWorld, { target, room, throwerId }: Ball): EffectOutcome {
  if (!target) return "done";
  const thrower = world.players[throwerId];
  const isThere = target.room.name === room.name && canTame(target);
  if (!isInRoom(thrower) || !isThere || !rollCatch(world.dice.random)) return "broke";
  return "caught";
}

function endBall(world: ServerWorld, ball: Ball, outcome: EffectOutcome) {
  /* Told first, so the ball is still on screen when the creature goes into it */
  world.io.to(ball.room.name).emit("effectEnded", { id: ball.id, outcome });
  const thrower = world.players[ball.throwerId];
  if (outcome === "caught" && ball.target && isInRoom(thrower)) {
    catchAsCompanion(world, thrower, ball.target);
  }
}
