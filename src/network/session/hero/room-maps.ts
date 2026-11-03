import { readTileMap, type TiledMapJson, type TileMap } from "@/rules/movement/tilemap";

/** A room's map as Tiled exports it. */
export type RoomMapJson = TiledMapJson;

/** Reads each room's walls once, from its Tiled JSON (undefined if unknown). */
export function createRoomMaps(load: (roomName: string) => RoomMapJson | undefined) {
  const maps = new Map<string, TileMap | undefined>();
  return (roomName: string) => {
    if (!maps.has(roomName)) {
      const json = load(roomName);
      maps.set(roomName, json ? readTileMap(json) : undefined);
    }
    return maps.get(roomName);
  };
}
