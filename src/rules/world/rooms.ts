import type { Point } from "./geometry";

type InRoom = { room?: { name: string } | null };

/** Everything in a collection that is currently in the named room. */
export function entitiesInRoom<T extends InRoom>(
  entities: Readonly<Record<string, T>>,
  roomName: string,
): T[] {
  return Object.values(entities).filter((entity) => entity?.room?.name === roomName);
}

/**
 * Groups entities by the room they are in, with a (possibly empty) list for every named room.
 * Entities whose room is not in `roomNames`, or that fail `include`, are left out.
 */
export function groupByRoom<T extends InRoom>(
  entities: Readonly<Record<string, T>>,
  roomNames: readonly string[],
  include: (entity: T) => boolean = () => true,
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const name of roomNames) groups[name] = [];
  for (const entity of Object.values(entities)) {
    const name = entity?.room?.name;
    if (name && groups[name] && include(entity)) groups[name].push(entity);
  }
  return groups;
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
