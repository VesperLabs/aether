import { getObjectProperty, type TileMap } from "./tilemap";

/** A door on a map: where it is and where it leads. */
export interface DoorData {
  name: string;
  destMap?: string;
  destDoor?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Where a player appears when they come out of this door. */
  centerPos: { x: number; y: number };
}

/** The doors on a map's `Doors` layer, by name. */
export function readDoors(map: TileMap): Record<string, DoorData> {
  const doors: Record<string, DoorData> = {};
  for (const door of map.objects.Doors ?? []) {
    const { name, x, y, width = 0, height = 0 } = door;
    doors[name] = {
      name,
      destMap: getObjectProperty<string>(door, "destMap"),
      destDoor: getObjectProperty<string>(door, "destDoor"),
      x,
      y,
      width,
      height,
      centerPos: { x: x + width / 2, y: y + height / 2 },
    };
  }
  return doors;
}

type DoorRect = Pick<DoorData, "x" | "y" | "width" | "height" | "centerPos">;

/**
 * Where a player walking through `from` comes out of `to`: at the same spot along the door, so
 * walking through the left edge of a wide door lands on the left edge of the next one. The spot is
 * kept as a fraction of the door's long side; across the door it stays the center.
 */
export function doorArrival(
  player: { x: number; y: number },
  from: DoorRect,
  to: DoorRect,
): { x: number; y: number } {
  const fraction = (pos: number, start: number, size: number) =>
    size > 0 ? Math.min(1, Math.max(0, (pos - start) / size)) : 0.5;
  const along =
    from.width >= from.height
      ? fraction(player.x, from.x, from.width)
      : fraction(player.y, from.y, from.height);
  return to.width >= to.height
    ? { x: to.x + along * to.width, y: to.centerPos.y }
    : { x: to.centerPos.x, y: to.y + along * to.height };
}
