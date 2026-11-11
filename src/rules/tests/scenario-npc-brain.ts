import { getKnockbackVelocity, moveBodyThroughMap } from "../movement";
import { decideNpcAction, seek, type NpcBehaviorInput } from "../npc-behavior";
import { distanceTo, type System } from "../world";
import { START_NOW, type Arena, type ArenaCharacter, type ArenaWorld } from "./scenario-arena";

/** A mob that thinks with the real npc-behavior rules. */
export interface BrainMob extends ArenaCharacter {
  walkSpeed: number;
  attackDelay: number;
  /** Damage dealt to the target per swing. */
  attackDamage: number;
  state: NpcBehaviorInput["state"];
}

export function createBrainMob(id: string, x: number, y: number): BrainMob {
  return {
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    bodySize: 8,
    hitBoxSize: { width: 16, height: 32 },
    hp: 50,
    isDead: false,
    walkSpeed: 60,
    attackDelay: 300,
    attackDamage: 7,
    state: { lastAttack: START_NOW - 10_000, lastCast: { global: START_NOW - 10_000 } },
  };
}

const playerView = (p: ArenaCharacter) => ({
  socketId: p.id,
  x: p.x,
  y: p.y,
  bodySize: p.bodySize,
  isDead: p.isDead,
});

/**
 * Runs the mob's decision each tick, as the server's npc system does: asks `decideNpcAction`, moves
 * as told (chase, shove, stand still) and lands an attack at once (the wind-up is not simulated).
 * Damage goes through the event bus as `characterDamaged`.
 */
export function mobBrain(arena: Arena, mob: BrainMob): System<ArenaWorld> {
  const { world, room } = arena;
  return (_world, frame) => {
    const living = Object.values(world.players).filter((p) => !p.isDead);
    const nearest = living.sort((a, b) => distanceTo(mob, a) - distanceTo(mob, b))[0];
    const locked = mob.state.lockedPlayerId ? world.players[mob.state.lockedPlayerId] : undefined;

    const decision = decideNpcAction(
      {
        now: frame.now,
        time: frame.time,
        delta: frame.delta,
        npc: {
          x: mob.x,
          y: mob.y,
          bodySize: mob.bodySize,
          baseLevel: 5,
          stats: {
            level: 5,
            walkSpeed: mob.walkSpeed,
            attackDelay: mob.attackDelay,
            castDelay: 300,
          },
          startingCoords: { x: mob.x, y: mob.y },
          hasTalkers: false,
          abilities: {},
          buffs: [],
          weapons: {},
          behaviors: { fight: { starts: "onSight" } },
        },
        state: mob.state,
        isStunned: false,
        lockedPlayer: locked && playerView(locked),
        nearestPlayer: nearest && playerView(nearest),
        isNearCollideTile: false,
        isOutOfBounds: false,
      },
      () => 0.99,
    );

    mob.state.lockedPlayerId = decision.lockedPlayerId;
    mob.state.npcAttackReady = decision.npcAttackReady;
    mob.state.isAttacking = decision.isAttacking;

    const target = decision.targetPlayerId ? world.players[decision.targetPlayerId] : undefined;
    const { movement } = decision;
    if (movement.type === "chase" && target) {
      const { vx, vy } = seek(mob, target, mob.walkSpeed);
      mob.vx = vx;
      mob.vy = vy;
    } else if (movement.type === "knockback") {
      /* Sampled mid-tick (the tick spans the last delta ms) so the shove covers its whole distance */
      const shove = getKnockbackVelocity(movement.angle, movement.elapsed - frame.delta / 2);
      mob.vx = shove.x;
      mob.vy = shove.y;
    } else {
      mob.vx = mob.vy = 0;
    }
    moveBodyThroughMap(room.map, mob, frame.delta / 1000);

    if (decision.action.type === "attack" && target) {
      mob.state.lastAttack = frame.now;
      mob.state.npcAttackReady = false;
      mob.state.isAttacking = true;
      target.hp = Math.max(0, target.hp - mob.attackDamage);
      target.isDead = target.hp === 0;
      world.events.emit("characterDamaged", {
        victimId: target.id,
        attackerId: mob.id,
        amount: mob.attackDamage,
      });
    }
  };
}
