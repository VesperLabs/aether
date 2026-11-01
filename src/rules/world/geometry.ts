export interface Point {
  x: number;
  y: number;
}

export type CardinalDirection = "up" | "down" | "left" | "right";

/** The angle in degrees a direction points at (0 is right, 90 is down). */
export function getAngleFromDirection(direction: string): number {
  if (direction === "up") return 270;
  if (direction === "down") return 90;
  if (direction === "left") return 180;
  return 0;
}

/** Which of the four directions points from `character` toward `point` (horizontal wins ties). */
export function getCharacterDirection(character: Point, point: Point): CardinalDirection {
  const dx = point.x - character.x;
  const dy = point.y - character.y;

  // determine which direction has the greatest distance
  if (Math.abs(dx) >= Math.abs(dy)) {
    // horizontal distance is greater than or equal to vertical distance
    if (dx > 0) {
      return "right";
    } else {
      return "left";
    }
  } else {
    // vertical distance is greater than horizontal distance
    if (dy > 0) {
      return "down";
    } else {
      return "up";
    }
  }
}

export function distanceTo(first: Point, second: Point) {
  const dx = second?.x - first?.x;
  const dy = second?.y - first?.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** How much the other axis must win by before a moving character turns to face it. */
const FACING_SWITCH_RATIO = 1.3;

/**
 * Like `getCharacterDirection`, but keeps the current facing's axis until the other one clearly
 * wins, so walking near a diagonal doesn't flicker between the left and down sprites.
 */
export function getStickyDirection(
  current: string | undefined,
  character: Point,
  point: Point,
): CardinalDirection {
  const dx = point.x - character.x;
  const dy = point.y - character.y;
  const horizontal: CardinalDirection = dx > 0 ? "right" : "left";
  const vertical: CardinalDirection = dy > 0 ? "down" : "up";
  if (current === "left" || current === "right") {
    return Math.abs(dy) > Math.abs(dx) * FACING_SWITCH_RATIO ? vertical : horizontal;
  }
  if (current === "up" || current === "down") {
    return Math.abs(dx) > Math.abs(dy) * FACING_SWITCH_RATIO ? horizontal : vertical;
  }
  return getCharacterDirection(character, point);
}
