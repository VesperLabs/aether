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
