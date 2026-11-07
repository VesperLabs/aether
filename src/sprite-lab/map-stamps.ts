/**
 * Stamps: props cut from hand-made maps (a tree, a grave, a tent) with every layer they use,
 * collision included. Claude places stamps by id; code writes their tiles, so a prop is always
 * whole. Tiles are stored as global ids of the template map, so placing one is a plain copy.
 */
import { z } from "zod";

const STAMP_LAYERS = ["Shadows", "Overlay", "Extras", "Above", "Collide"] as const;

export type StampLayer = (typeof STAMP_LAYERS)[number];

/** Tiled keeps flips in the top bits of a global id. */
const FLIP_BITS = 0xe0000000;

export const Stamp = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use kebab-case, like oak-tree"),
  description: z.string().max(200),
  width: z.number().int().min(1).max(16),
  height: z.number().int().min(1).max(16),
  /** Row-major global ids per layer, 0 for empty. Layers the stamp doesn't use are left out. */
  layers: z.partialRecord(z.enum(STAMP_LAYERS), z.array(z.number().int().min(0))),
});

export type Stamp = z.infer<typeof Stamp>;

export const StampPlacement = z.object({
  id: z.string(),
  /** Top-left tile. */
  x: z.number().int(),
  y: z.number().int(),
});

export type StampPlacement = z.infer<typeof StampPlacement>;

export interface Tileset {
  readonly name: string;
  readonly firstgid: number;
}

interface TileLayer {
  readonly name: string;
  readonly type: string;
  readonly data?: readonly number[];
}

/** The parts of a Tiled map a stamp is cut from. */
export interface SourceMap {
  readonly width: number;
  readonly tilesets: readonly Tileset[];
  readonly layers: readonly TileLayer[];
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Turns a global id of `from` into the same tile's global id in `to`, or 0 if `to` lacks it. */
export const createGidMapper = (from: readonly Tileset[], to: readonly Tileset[]) => {
  const sorted = [...from].sort((a, b) => b.firstgid - a.firstgid);
  return (gid: number) => {
    const base = gid & ~FLIP_BITS;
    if (!base) return 0;
    const source = sorted.find((tileset) => tileset.firstgid <= base);
    const target = source && to.find((tileset) => tileset.name === source.name);
    if (!source || !target) return 0;
    return ((gid & FLIP_BITS) | (target.firstgid + base - source.firstgid)) >>> 0;
  };
};

/** Cuts `rect` out of `source`, re-numbered for `template`. */
export const captureStamp = (
  source: SourceMap,
  template: { readonly tilesets: readonly Tileset[] },
  rect: Rect,
  id: string,
  description: string,
): Stamp => {
  const toTemplate = createGidMapper(source.tilesets, template.tilesets);
  const layers: Stamp["layers"] = {};
  for (const name of STAMP_LAYERS) {
    const data = source.layers.find((layer) => layer.name === name)?.data;
    if (!data) continue;
    const cells: number[] = [];
    for (let y = 0; y < rect.height; y++) {
      for (let x = 0; x < rect.width; x++) {
        cells.push(toTemplate(data[(rect.y + y) * source.width + rect.x + x] ?? 0));
      }
    }
    if (cells.some(Boolean)) layers[name] = cells;
  }
  return { id, description, width: rect.width, height: rect.height, layers };
};

/**
 * Every stamp layer for a `width`×`height` map. Stamps lower on the map draw last, so a tree in
 * front covers the one behind it. Unknown ids and tiles past the edge are skipped.
 */
export const placeStamps = (
  width: number,
  height: number,
  placements: readonly StampPlacement[],
  library: readonly Stamp[],
): Record<StampLayer, number[]> => {
  const layers = Object.fromEntries(
    STAMP_LAYERS.map((name) => [name, Array<number>(width * height).fill(0)]),
  ) as Record<StampLayer, number[]>;
  const byId = new Map(library.map((stamp) => [stamp.id, stamp]));
  const placed = placements
    .flatMap((placement) => {
      const stamp = byId.get(placement.id);
      return stamp ? [{ placement, stamp }] : [];
    })
    .sort((a, b) => a.placement.y + a.stamp.height - (b.placement.y + b.stamp.height));
  for (const { placement, stamp } of placed) {
    for (const name of STAMP_LAYERS) {
      stamp.layers[name]?.forEach((gid, index) => {
        const x = placement.x + (index % stamp.width);
        const y = placement.y + Math.floor(index / stamp.width);
        if (gid && x >= 0 && y >= 0 && x < width && y < height) layers[name][y * width + x] = gid;
      });
    }
  }
  return layers;
};

/** The placement whose footprint covers a tile, topmost first, for removing by click. */
export const placementAt = (
  placements: readonly StampPlacement[],
  library: readonly Stamp[],
  x: number,
  y: number,
) =>
  placements.findLastIndex((placement) => {
    const stamp = library.find((candidate) => candidate.id === placement.id);
    return (
      !!stamp &&
      x >= placement.x &&
      y >= placement.y &&
      x < placement.x + stamp.width &&
      y < placement.y + stamp.height
    );
  });
