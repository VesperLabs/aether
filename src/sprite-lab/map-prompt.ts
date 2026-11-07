import { z } from "zod";
import { StampPlacement, type Stamp } from "./map-stamps";
import { TERRAINS, type TerrainGrid } from "./map-terrain";

export const MapRequest = z.object({
  instruction: z.string().min(1).max(4000),
  /** Tiles across and down; the terrain grid is one larger each way. */
  width: z.number().int().min(8).max(80),
  height: z.number().int().min(8).max(80),
  /** The current grid, to revise instead of starting over. */
  grid: z.array(z.string()).optional(),
  /** The current stamps, revised along with the grid. */
  stamps: z.array(StampPlacement).optional(),
});

export type MapRequest = z.infer<typeof MapRequest>;

export const MapReply = z.object({
  rows: z.array(z.string()),
  stamps: z.array(StampPlacement),
  notes: z.string(),
});

export type MapReply = z.infer<typeof MapReply>;

export const MAP_REPLY_SCHEMA = z.toJSONSchema(MapReply, { target: "draft-7" });

const LEGEND = TERRAINS.map(({ letter, name }) => `${letter} = ${name}`).join(", ");

const blocks = (stamp: Stamp) => stamp.layers.Collide?.some(Boolean) ?? false;

const catalog = (library: readonly Stamp[]) =>
  library
    .map(
      (stamp) =>
        `- ${stamp.id} (${stamp.width}x${stamp.height}${blocks(stamp) ? ", blocks" : ""}): ${stamp.description}`,
    )
    .join("\n");

const STAMP_RULES = (library: readonly Stamp[]) =>
  library.length
    ? `
Stamps are props placed by their top-left tile: {"id", "x", "y"} in tiles, 0-based, where tile (x, y) sits between grid corners x..x+1 and y..y+1. Available stamps (width x height in tiles):
${catalog(library)}
- Place stamps on land, never over water.
- Stamps may overlap a little to make dense forests; the lower one draws in front.
- Group props naturally: tree clusters and forest edges, not an even scatter. Leave paths and clearings open.
- Blocking stamps must never cut off the routes between map edges.`
    : `
No stamps exist yet: return "stamps": [].`;

export const buildSystemPrompt = (library: readonly Stamp[]) =>
  `You lay out top-down maps for a 2D online RPG. You output a terrain grid and a list of stamps; code turns them into tiles.

Grid: rows of letters, ${LEGEND}. Each letter is a tile corner, so shapes need to be at least 2 letters wide to show up.
Rules the tileset needs:
- Dark grass only ever touches grass. Surround it with grass before any water or sand.
- Water reads best with a sand or grass shore. Water blocks movement; everything else is walkable.
- Make shapes organic: rounded lakes, winding paths and rivers, irregular patches. Avoid straight-edged rectangles.
- Keep walkable routes between map edges so players can cross the map.
${STAMP_RULES(library)}
Fill "notes" with one or two sentences on the layout and where exits and points of interest would go.`;

export const buildMapPrompt = ({ instruction, width, height, grid, stamps }: MapRequest) => {
  const size = `The grid must be exactly ${height + 1} rows of exactly ${width + 1} letters. The map is ${width}x${height} tiles.`;
  if (!grid?.length) return `${size}\n\nMake this map: ${instruction}`;
  return `${size}\n\nHere is the current grid:\n${grid.join("\n")}\n\nCurrent stamps:\n${JSON.stringify(stamps ?? [])}\n\nRevise it: ${instruction}\nKeep everything the request doesn't mention as it is, including stamps.`;
};

export const replyToGrid = (reply: MapReply): TerrainGrid => reply.rows.map((row) => row.trim());

/** Drops stamps that don't exist, lie off the map, or stand on water. */
export const cleanStamps = (
  placements: readonly StampPlacement[],
  library: readonly Stamp[],
  blocked: readonly boolean[],
  width: number,
) =>
  placements.filter((placement) => {
    const stamp = library.find(({ id }) => id === placement.id);
    if (!stamp || placement.x < 0 || placement.y < 0) return false;
    const height = blocked.length / width;
    if (placement.x + stamp.width > width || placement.y + stamp.height > height) return false;
    const footprint = stamp.layers.Overlay ?? stamp.layers.Extras ?? stamp.layers.Collide;
    return !footprint?.some((gid, index) => {
      const x = placement.x + (index % stamp.width);
      const y = placement.y + Math.floor(index / stamp.width);
      return gid && blocked[y * width + x];
    });
  });
