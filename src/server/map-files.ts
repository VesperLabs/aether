import fs from "fs";
import path from "path";
import type { TiledMapJson } from "@/rules/movement";

/** Reads a map JSON file from the public folder. */
export const readMapFile = (file: string): TiledMapJson =>
  JSON.parse(fs.readFileSync(path.resolve(process.env.PUBLIC_DIR || "public", file), "utf8"));
