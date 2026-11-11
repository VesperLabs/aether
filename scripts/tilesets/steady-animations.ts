import fs from "node:fs";
import path from "node:path";
import type { PNG } from "pngjs";
import { TILE } from "./tile-image";

const TILEMAPS = "public/assets/tilemaps";
/** Summed RGB difference under which a pixel counts as the same in every frame. */
const STILL = 48;

interface TiledAnimation {
  readonly id: number;
  readonly animation?: readonly { readonly tileid: number }[];
}

/** Every animation the maps define for a tileset, as lists of frame tile ids. */
export const readAnimations = (tileset: string) => {
  const animations = new Map<number, number[]>();
  for (const file of fs.readdirSync(TILEMAPS).filter((name) => name.endsWith(".json"))) {
    const map = JSON.parse(fs.readFileSync(path.join(TILEMAPS, file), "utf8"));
    const set = map.tilesets.find((candidate: { name: string }) => candidate.name === tileset);
    for (const tile of (set?.tiles ?? []) as TiledAnimation[])
      if (tile.animation)
        animations.set(
          tile.id,
          tile.animation.map((frame) => frame.tileid),
        );
  }
  return [...animations.values()];
};

/**
 * Scaled-down frames differ by a pixel here and there where the art barely moves, which makes still
 * ground flicker as the animation plays. Copy the first frame's pixel into every frame wherever no
 * frame really changes it, so only the moving parts (water, foam) animate.
 */
export const steadyAnimations = (sheet: PNG, columns: number, animations: number[][]) => {
  const at = (tile: number, x: number, y: number) =>
    ((Math.floor(tile / columns) * TILE + y) * sheet.width + (tile % columns) * TILE + x) * 4;
  for (const frames of animations)
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const first = at(frames[0], x, y);
        const still = frames.every((frame) => {
          const pixel = at(frame, x, y);
          const alpha = Math.abs(sheet.data[pixel + 3] - sheet.data[first + 3]);
          const color =
            Math.abs(sheet.data[pixel] - sheet.data[first]) +
            Math.abs(sheet.data[pixel + 1] - sheet.data[first + 1]) +
            Math.abs(sheet.data[pixel + 2] - sheet.data[first + 2]);
          return alpha < 32 && color < STILL;
        });
        if (still)
          for (const frame of frames.slice(1))
            sheet.data.copy(sheet.data, at(frame, x, y), first, first + 4);
      }
};
