export interface Point {
  x: number;
  y: number;
}

export type CardinalDirection = "up" | "down" | "left" | "right";

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
