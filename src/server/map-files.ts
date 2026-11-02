import fs from "fs";
import path from "path";
import { mapList } from "@/content";
import type { TiledMapJson } from "@/rules/movement";

/** Reads a map JSON file from the public folder. */
export const readMapFile = (file: string): TiledMapJson =>
  JSON.parse(fs.readFileSync(path.resolve(process.env.PUBLIC_DIR || "public", file), "utf8"));

/** Reads a room's map by room name, as bots read the rooms they walk into. */
export function readRoomMap(roomName: string): TiledMapJson {
  const asset = mapList.find((m) => m.name === roomName);
  if (!asset) throw new Error(`No map for room "${roomName}"`);
  return readMapFile(asset.json);
}
