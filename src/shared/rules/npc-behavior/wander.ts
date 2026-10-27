import { NPC_TALK_RANGE, NPC_WANDER_CHANGE_DELAY, NPC_WANDER_SPEED_DIVISOR } from "./constants";
import { checkInRange, type Body } from "./range";

/** Velocity and facing to set. A missing field is left as it is. */
export interface WanderChange {
  vx?: number;
  vy?: number;
  direction?: "left" | "right" | "up" | "down";
}

export interface WanderInput {
  /** The scene time, which paces direction changes. */
  time: number;
  walkSpeed: number;
}

/** Most ticks keep going (an empty change); every few frames pick a new direction, or stop. */
export function decideWander({ time, walkSpeed }: WanderInput, rng: () => number): WanderChange {
  const wanderSpeed = walkSpeed / NPC_WANDER_SPEED_DIVISOR;

  if (time % NPC_WANDER_CHANGE_DELAY > 1) return {};

  const randNumber = Math.floor(rng() * 7 + 1);
  switch (randNumber) {
    case 1:
      return { vx: -wanderSpeed, direction: "left" };
    case 2:
      return { vx: wanderSpeed, direction: "right" };
    case 3:
      return { vy: -wanderSpeed, direction: "up" };
    case 4:
      return { vy: wanderSpeed, direction: "down" };
    default:
      return { vy: 0, vx: 0 };
  }
}

/** Which players the NPC stops talking to because they walked off. */
export function decideTalkingEnded(
  self: Body,
  talkingIds: string[],
  getPlayer: (id: string) => Body | null | undefined,
): string[] {
  return talkingIds.filter((id) => !checkInRange(self, getPlayer(id), NPC_TALK_RANGE));
}
