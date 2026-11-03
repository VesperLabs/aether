import fs from "fs";
import path from "path";
import type { TiledMapJson } from "@/rules/movement";

/** Reads a map JSON file from the public folder (`config.publicDir`). */
export const readMapFile = (publicDir: string, file: string): TiledMapJson =>
  JSON.parse(fs.readFileSync(path.resolve(publicDir, file), "utf8"));
