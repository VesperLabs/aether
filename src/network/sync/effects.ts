import type { Point } from "@/rules/world";

/*
 * Effects: anything in flight in a room (spells, projectiles, thrown balls). The server owns each
 * one for its whole life, whoever made it and whoever is watching. A client gets it whole when it
 * starts (`effectStarted`) and with the room state when it walks in, then plays it on its own;
 * only its end is sent (`effectEnded`). Nothing goes out per tick.
 *
 * Times travel as an age (how long ago it started, in ms), never as a clock, so a client needs no
 * clock sync: it starts the effect that far along.
 */

interface EffectBase {
  id: string;
  /** How long ago it started, in ms, when this was sent. */
  ageMs: number;
}

/** A spell or ranged attack flying on its own, away from its caster. */
export interface SpellEffectWire extends EffectBase {
  kind: "spell";
  casterId: string;
  spellName: string;
  castAngle: number;
  action?: string;
  rank?: number;
  /** Where it left the caster: they may have moved since. */
  spawnPoint: Point;
}

/** A thrown ball: flies at its target (or to the ground), then struggles on it. */
export interface BallEffectWire extends EffectBase {
  kind: "ball";
  throwerId: string;
  texture: string;
  from: Point;
  /** Where it lands when it hits nothing. */
  to: Point;
  flightMs: number;
  /** The creature it hit. It struggles on it for `struggleMs` before it ends. */
  targetId?: string;
  struggleMs: number;
}

export type EffectWire = SpellEffectWire | BallEffectWire;

/** How an effect ended. A ball that `caught` its creature, or one that `broke` free. */
export type EffectOutcome = "caught" | "broke" | "done";

export interface EffectEndedMessage {
  id: string;
  outcome: EffectOutcome;
}

/** Anything on the server that can be described as an effect, if it is one right now. */
export interface EffectSource {
  room?: { name?: string } | null;
  toEffect(now: number): EffectWire | undefined;
}

/** The effects in a room, for a client walking in. */
export function getRoomEffects(
  sources: Iterable<EffectSource>,
  roomName: string,
  now: number,
): EffectWire[] {
  const effects: EffectWire[] = [];
  for (const source of sources) {
    if (source.room?.name !== roomName) continue;
    const effect = source.toEffect(now);
    if (effect) effects.push(effect);
  }
  return effects;
}
