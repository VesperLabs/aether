/**
 * The tileset sheets the maps use, and which exported art fills each one.
 *
 * Exports live in art/tilesets/exports (not in git) as "<Family>[ <Color>]@128x128.png", drawn at 128px per
 * tile. A sheet places whole families side by side at 32px. Its layout (columns, rows) is what tile
 * ids in the maps point at, so never change it: add new art in unused slots or through overrides.
 */
export interface Sheet {
  /** Output file and Tiled tileset name: `<name>.png`, `<name>-<color>.png`. */
  readonly name: string;
  readonly columns: number;
  readonly rows: number;
  /** Families of exports and the column each starts at. */
  readonly blocks: readonly { readonly family: string; readonly column: number }[];
}

export const SHEETS: readonly Sheet[] = [
  {
    name: "grassland",
    columns: 96,
    rows: 16,
    blocks: [
      { family: "grassland", column: 0 },
      { family: "grassland-2", column: 16 },
      { family: "water", column: 32 },
      { family: "waterfall", column: 48 },
    ],
  },
  {
    name: "town",
    columns: 37,
    rows: 16,
    blocks: [
      { family: "town", column: 0 },
      { family: "water-animation", column: 16 },
    ],
  },
  {
    name: "town-inside",
    columns: 32,
    rows: 16,
    blocks: [
      { family: "interior", column: 0 },
      { family: "interior-2", column: 16 },
    ],
  },
  {
    name: "mine",
    columns: 32,
    rows: 16,
    blocks: [
      { family: "mine", column: 0 },
      { family: "mine-2", column: 16 },
    ],
  },
];

/** Color variations an export can have, as written in its file name. */
const COLORS = ["color 2", "color 3", "fall", "spring", "winter", "ice"] as const;

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** "Town 2 Fall@128x128.png" → { family: "town-2", color: "fall" }; base art has color "". */
export const parseExportName = (file: string) => {
  const words = file
    .replace(/@128x128\.png$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .toLowerCase();
  const color = COLORS.find((candidate) => words.endsWith(" " + candidate)) ?? "";
  const family = slug(color ? words.slice(0, -color.length - 1) : words);
  return { family, color: slug(color) };
};
