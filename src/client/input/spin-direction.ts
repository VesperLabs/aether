import type { Point } from "@/rules/world";

export function getSpinDirection(hero: Point, point: Point) {
  const dx = point.x - hero.x;
  const dy = point.y - hero.y;

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

/** The facing for an aim angle (radians, 0 pointing right), by the same rule as `getSpinDirection`. */
export function getAngleDirection(angle: number) {
  return getSpinDirection({ x: 0, y: 0 }, { x: Math.cos(angle), y: Math.sin(angle) });
}
