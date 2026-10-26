import type { Box, Circle } from "../movement";

/** What the hit shapes read from a character. */
export interface CharacterShapeInput {
  x: number;
  y: number;
  bodySize: number;
  hitBoxSize: { width: number; height: number };
}

/** The box a spell must touch to hit a character: stands on the character's feet, head up. */
export function characterHitBox(character: CharacterShapeInput): Box {
  const { width, height } = character.hitBoxSize;
  const bottom = character.y + character.bodySize;
  return { x: character.x, y: bottom - height / 2, halfWidth: width / 2, halfHeight: height / 2 };
}

/** The small circle around a character's feet, used for single-target melee hits. */
export function characterBodyCircle(character: CharacterShapeInput): Circle {
  return { x: character.x, y: character.y, radius: character.bodySize };
}
