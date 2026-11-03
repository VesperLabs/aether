import fs from "fs";
import path from "path";
import { mapList } from "@/content/maps/map-list";
import type { TiledMapJson } from "@/rules/movement/tilemap";

/** A map loader for bots that reads the room's Tiled JSON from the public folder. */
export function createMapLoader(publicDir: string) {
  const cache = new Map<string, TiledMapJson | undefined>();
  return (roomName: string): TiledMapJson | undefined => {
    if (!cache.has(roomName)) {
      const asset = mapList.find((m) => m.name === roomName);
      cache.set(
        roomName,
        asset
          ? JSON.parse(fs.readFileSync(path.resolve(publicDir, asset.json), "utf8"))
          : undefined,
      );
    }
    return cache.get(roomName);
  };
}

/** The public folder the server reads maps from by default, relative to the repo root. */
export const DEFAULT_PUBLIC_DIR = "public";
