import { hasHand } from "../assets/attack-hands";
import BODIES from "./bodies.json";

/**
 * What a character's body can do, by its `race`. Rules ask the body, never "is it human". Bodies
 * without hands attack with what their sprite already shows (claws, teeth, slime).
 */
export interface BodyDefinition {
  /**
   * Holds an item in `handLeft`, drawn at its left hand points. A body has a hand once its points
   * for it are placed in `weapon.json` (the sprite lab's body window), never by a flag. One with no
   * right hand attacks with what its sprite shows (claws, teeth) on that side.
   */
  readonly handLeft: boolean;
  /** Holds an item in `handRight`, as `handLeft` does. */
  readonly handRight: boolean;
  /** Has `attack_left`/`attack_right` animations; other bodies just stand while attacking. */
  readonly attackAnims: boolean;
}

/**
 * Each body's flags. Data, not code, so the sprite lab's NPC editor can switch them (see
 * `/api/body-flags` in `sprite-lab/store-plugin.ts`).
 */
const bodies = BODIES as Record<keyof typeof BODIES, { attackAnims?: boolean }>;

export type BodyId = keyof typeof bodies;

/** Whether a body has either hand. */
export const hasAnyHand = (body: BodyDefinition) => body.handLeft || body.handRight;

/** The body of a `race`; unknown races get a plain body with no hands or attack animations. */
export function getBody(race: string | undefined): BodyDefinition {
  const known = (bodies as Record<string, { attackAnims?: boolean }>)[race ?? ""];
  return {
    handLeft: hasHand(race, "left"),
    handRight: hasHand(race, "right"),
    attackAnims: !!known?.attackAnims,
  };
}
