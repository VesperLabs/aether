/**
 * Build every color of every tileset sheet from the exported art: `npm run tilesets`.
 *
 * For each sheet in sheets.ts and each color its first family was exported in:
 *  1. place each family's export of that color (or its base art) at its columns, at 32px
 *  2. fill the sheet's references from art/tilesets/overrides/<sheet>.json: whole tiles of another export, or
 *     slices of one cut to a shape, so custom tiles come out in every color
 *  3. draw the hand-painted tiles in art/tilesets/overrides/<sheet>.png, then <sheet>-<color>.png on top
 * and writes public/assets/tilesets/<sheet>[-<color>].png, extruded for the game.
 */
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { parseExportName, SHEETS, type Sheet } from "./sheets";
import { readAnimations, steadyAnimations } from "./steady-animations";
import {
  clearEmptyMarker,
  copyTile,
  downscale,
  extrude,
  readPng,
  TILE,
  tileIsEmpty,
  writePng,
} from "./tile-image";

const EXPORTS = "art/tilesets/exports";
const OVERRIDES = "art/tilesets/overrides";
const OUT = "public/assets/tilesets";
const EXPORT_SCALE = 4;

/** A tile filled from an export instead of the sheet's own block. */
export interface TileReference {
  readonly from: string;
  readonly tile: readonly [number, number];
  /** Cut the tile to the shape of this slot in <sheet>.png. */
  readonly cut?: boolean;
}
export type SheetReferences = Record<`${number},${number}`, TileReference>;

const loadExports = () => {
  const art = new Map<string, PNG>();
  for (const file of fs.readdirSync(EXPORTS).filter((name) => name.endsWith(".png"))) {
    const { family, color } = parseExportName(file);
    art.set(
      `${family}|${color}`,
      downscale(clearEmptyMarker(readPng(path.join(EXPORTS, file))), EXPORT_SCALE),
    );
  }
  return art;
};

const colorsOf = (sheet: Sheet, art: Map<string, PNG>) => {
  const family = sheet.blocks[0].family;
  return [...art.keys()]
    .filter((key) => key.startsWith(family + "|"))
    .map((key) => key.split("|")[1])
    .sort();
};

const readOptionalPng = (file: string) => (fs.existsSync(file) ? readPng(file) : undefined);

export const readReferences = (sheet: string): SheetReferences => {
  const file = path.join(OVERRIDES, `${sheet}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
};

const parseSlot = (slot: string) => slot.split(",").map(Number) as [number, number];

/** Paint every visible tile of `layer` onto `target`, skipping the slots in `skip`. */
const paintTiles = (layer: PNG, target: PNG, skip: Set<string>) => {
  for (let row = 0; row < layer.height / TILE; row++)
    for (let column = 0; column < layer.width / TILE; column++)
      if (!skip.has(`${column},${row}`) && !tileIsEmpty(layer, column, row))
        copyTile(layer, [column, row], target, [column, row]);
};

/** One color of one sheet, at 32px with no padding. */
export const composeSheet = (sheet: Sheet, color: string, art: Map<string, PNG>) => {
  const pick = (family: string) => art.get(`${family}|${color}`) ?? art.get(`${family}|`);
  const out = new PNG({ width: sheet.columns * TILE, height: sheet.rows * TILE });
  for (const { family, column } of sheet.blocks) {
    const source = pick(family);
    if (!source) throw new Error(`No export for ${family}`);
    for (let row = 0; row < Math.min(sheet.rows, source.height / TILE); row++)
      for (let x = 0; x < source.width / TILE && column + x < sheet.columns; x++)
        copyTile(source, [x, row], out, [column + x, row]);
  }
  const references = readReferences(sheet.name);
  const custom = readOptionalPng(path.join(OVERRIDES, `${sheet.name}.png`));
  for (const [slot, reference] of Object.entries(references)) {
    const source = pick(reference.from);
    if (!source) throw new Error(`${sheet.name} ${slot}: no export for ${reference.from}`);
    const at = parseSlot(slot);
    if (reference.cut && !custom)
      throw new Error(`${sheet.name} ${slot}: cut needs ${sheet.name}.png`);
    copyTile(source, reference.tile, out, at, reference.cut ? { png: custom!, at } : undefined);
  }
  const referenced = new Set(Object.keys(references));
  if (custom) paintTiles(custom, out, referenced);
  const colored = color && readOptionalPng(path.join(OVERRIDES, `${sheet.name}-${color}.png`));
  if (colored) paintTiles(colored, out, new Set());
  return out;
};

const main = () => {
  const art = loadExports();
  for (const sheet of SHEETS) {
    const animations = readAnimations(`tileset-${sheet.name}`);
    for (const color of colorsOf(sheet, art)) {
      const name = color ? `${sheet.name}-${color}` : sheet.name;
      const composed = composeSheet(sheet, color, art);
      steadyAnimations(composed, sheet.columns, animations);
      writePng(path.join(OUT, `${name}.png`), extrude(composed));
      console.log("built", name);
    }
  }
};

if (process.argv[1]?.endsWith("build-tilesets.ts")) main();
