import type { Point } from "./geometry";

type InRoom = { room?: { name: string } | null };

/** Everything in a collection that is currently in the named room. */
export function entitiesInRoom<T extends InRoom>(
  entities: Readonly<Record<string, T>>,
  roomName: string,
): T[] {
  return Object.values(entities).filter((entity) => entity?.room?.name === roomName);
}

/** The entity closest to a point, or undefined when there are none. */
export function nearestTo<T extends Point>(entities: T[], point: Point): T | undefined {
  let closest: T | undefined;
  let closestDistance = Infinity;
  for (const entity of entities) {
    const distance = Math.hypot(entity.x - point.x, entity.y - point.y);
    if (distance < closestDistance) {
      closest = entity;
      closestDistance = distance;
    }
  }
  return closest;
}
