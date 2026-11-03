import { getAngleFromDirection } from "@/rules/world/geometry";
import type { HeroCombatState } from "./hero-combat";
import { getSpinDirection } from "./spin-direction";

interface Vector {
  x: number;
  y: number;
}

export interface FacingInput {
  hero: Vector;
  intent: {
    keys?: Vector;
    direction?: string;
    angle?: number;
    isAiming?: boolean;
    isAimingDodge?: boolean;
  };
  /** The way the hero faces now. */
  facing: string;
  lastAngle: number;
  /** The last swing is still recovering. */
  isSwinging: boolean;
  combat: Pick<HeroCombatState, "dodgeAngle" | "dodgeFacing" | "lungeAngle">;
  isRolling: boolean;
  isLunging: boolean;
}

/**
 * Which way the hero means to face and aim this frame. Rolls and lunges override what the player
 * asks; `isAimTurn` says an aim moved and the server should hear of it.
 */
export function chooseFacing(input: FacingInput) {
  const { intent, hero, combat } = input;
  let direction = intent.direction ?? input.facing;
  let lastAngle = input.lastAngle;
  /* Keeps bows facing the right direction if you try to spin out of an attack */
  if (input.isSwinging && (intent.keys?.x || intent.keys?.y)) {
    lastAngle = (getAngleFromDirection(direction) * Math.PI) / 180;
  }
  if (intent.angle !== undefined) lastAngle = intent.angle;
  const isAimTurn = (!!intent.isAiming || !!intent.isAimingDodge) && lastAngle !== input.lastAngle;

  /* A roll commits to the way it was aimed, still facing the way you were */
  if (input.isRolling) {
    lastAngle = combat.dodgeAngle ?? 0;
    direction = combat.dodgeFacing ?? direction;
  }
  /* Unlike a roll, a lunge faces the way it goes for the whole dash */
  if (input.isLunging) {
    lastAngle = combat.lungeAngle ?? 0;
    direction = getSpinDirection(hero, {
      x: hero.x + Math.cos(lastAngle),
      y: hero.y + Math.sin(lastAngle),
    });
  }
  return { direction, lastAngle, isAimTurn };
}
