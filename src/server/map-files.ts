import fs from "fs";
import path from "path";
import { readMapWithTilesets, type TiledMapJson } from "@/rules/movement";

const readJson = (file: string): unknown =>
  JSON.parse(fs.readFileSync(path.resolve(process.env.PUBLIC_DIR || "public", file), "utf8"));

/** Reads a map JSON file from the public folder, with the shared tilesets it lists put back in. */
export const readMapFile = (file: string): TiledMapJson =>
  readMapWithTilesets<TiledMapJson>(file, readJson);
