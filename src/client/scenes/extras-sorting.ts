import Phaser from "phaser";
import { debugExtras } from "./extras-debug";
import { findProps, propFoot, type CellAt } from "./extras-props";
import { pixelsOf } from "./tile-pixels";

/** Characters sort from here by their feet (see `Player`); props sort the same way by their base. */
const SORT_DEPTH = 100;
/** Only fully opaque pixels count as the ground a prop stands on: baked-in shadows are translucent. */
const SOLID = 255;

/** The foot (px from the layer's top) each cell's prop sorts at, `null` where nothing is painted. */
export type FeetGrid = (number | null)[][];

/** How far past what it covers a prop on a higher layer sorts: under a pixel, so no character fits between. */
const COVER_STEP = 0.5;

interface SortedTile {
  tile: Phaser.Tilemaps.Tile;
  image: Phaser.GameObjects.Image;
  /** What the image shows, so it redraws only when the tile's art changes. */
  shown: string;
}

/** The texture frame for a tile's art, added to its tileset's texture the first time it's drawn. */
function tileFrame(tile: Phaser.Tilemaps.Tile) {
  const tileset = tile.tileset as Phaser.Tilemaps.Tileset;
  const texture = tileset.image as Phaser.Textures.Texture;
  /* By the tile's id in its tileset: its id in the map differs between maps sharing the texture */
  const name = `tile-${tile.index - tileset.firstgid}`;
  if (!texture.has(name)) {
    const { x, y } = tileset.getTileTextureCoordinates(tile.index) as { x: number; y: number };
    texture.add(name, 0, x, y, tileset.tileWidth, tileset.tileHeight);
  }
  return { key: texture.key, name };
}

/** Each tile art's lowest row with a solid pixel, measured once. */
const lowestSolidRows = new Map<string, number | null>();

function lowestSolidRow(tile: Phaser.Tilemaps.Tile) {
  const { key, name } = tileFrame(tile);
  const id = `${key}/${name}`;
  if (!lowestSolidRows.has(id)) {
    const tileset = tile.tileset as Phaser.Tilemaps.Tileset;
    const { data, width } = pixelsOf(tileset.image as Phaser.Textures.Texture);
    const { x, y } = tileset.getTileTextureCoordinates(tile.index) as { x: number; y: number };
    let lowest: number | null = null;
    for (let row = tileset.tileHeight - 1; row >= 0 && lowest === null; row--) {
      for (let column = 0; column < tileset.tileWidth; column++) {
        if (data[((y + row) * width + x + column) * 4 + 3] >= SOLID) {
          lowest = row;
          break;
        }
      }
    }
    lowestSolidRows.set(id, lowest);
  }
  return lowestSolidRows.get(id) ?? null;
}

/** A tile's own properties in its tileset (`base`, `sortOffset`). */
function propertiesOf(tile: Phaser.Tilemaps.Tile) {
  return tile.tileset?.getTileProperties(tile.index) as
    | { base?: unknown; sortOffset?: unknown }
    | null
    | undefined;
}

function sortOffsetOf(tile: Phaser.Tilemaps.Tile) {
  const offset = propertiesOf(tile)?.sortOffset;
  return typeof offset === "number" ? offset : 0;
}

function redraw(sorted: SortedTile) {
  const { key, name } = tileFrame(sorted.tile);
  const shown = `${key}/${name}`;
  if (shown === sorted.shown) return;
  sorted.image.setTexture(key, name);
  sorted.shown = shown;
}

/**
 * Draws a props layer (`Props 1` to `3`) as one image per tile, sorted with characters by where the prop each
 * tile belongs to stands (see `findProps` and `propFoot`): its lowest solid pixel, so a tree sorts at
 * the foot of its trunk. Walking below it puts you in front, above it behind. The layer itself stays, hidden, as the tiles' data: the animated tiles plugin
 * and season changes still change its tiles, and each image follows its tile every frame.
 * A layer drawn over another (`Props 2` over `Props 1`) passes that one's `feet`: a tile that
 * covers a painted cell there sorts just past it, so it stays on top as in Tiled, while the rest of
 * its prop keeps its own foot rather than joining the prop below. Where it covers, the prop below
 * hides you anyway, so the tile drawing over you there shows nothing new.
 * Returns a function that removes the images, and the foot each cell sorts at.
 */
export function sortExtras(
  scene: Phaser.Scene,
  layer: Phaser.Tilemaps.TilemapLayer,
  below?: FeetGrid,
): { remove: () => void; feet: FeetGrid } {
  layer.setVisible(false);
  const tiles = layer.layer.data;
  const props = findProps(
    tiles.map((row) =>
      row.map((tile) =>
        tile.index < 0 || !tile.tileset
          ? null
          : {
              base: propertiesOf(tile)?.base === true,
              alone: sortOffsetOf(tile) !== 0,
            },
      ),
    ),
  );

  const sorted: SortedTile[] = [];
  const at = ([row, column]: CellAt) => tiles[row][column];
  const debug: { cells: CellAt[]; foot: number }[] = [];
  const feet: FeetGrid = tiles.map((row) => row.map(() => null));
  for (const prop of props) {
    /* `sortOffset` (in tiles) moves the line down to where raised art meets the ground: a wall's top */
    /* Negative moves it up: `-1` sorts a wall strip by its top, so you stay in front until above it */
    const shift = prop
      .map((cell) => sortOffsetOf(at(cell)))
      .reduce((most, offset) => (Math.abs(offset) > Math.abs(most) ? offset : most), 0);
    const own =
      propFoot(prop, layer.layer.tileHeight, (cell) => lowestSolidRow(at(cell))) +
      shift * layer.layer.tileHeight;
    /* Each line it sorts at, with its cells: its own, and past the layer below where it covers it */
    const lines = new Map<number, CellAt[]>();
    for (const cell of prop) {
      const [r, c] = cell;
      const foot = Math.max(own, (below?.[r]?.[c] ?? -Infinity) + COVER_STEP);
      feet[r][c] = foot;
      lines.set(foot, [...(lines.get(foot) ?? []), cell]);
      const tile = at(cell);
      /* Bottom-aligned like Phaser draws tiles, so taller tileset tiles grow upward */
      const image = scene.add
        .image(tile.pixelX + layer.x, tile.pixelY + tile.baseHeight + layer.y, "__DEFAULT")
        .setOrigin(0, 1)
        .setFlip(tile.flipX, tile.flipY)
        .setDepth(SORT_DEPTH + layer.y + foot);
      const entry = { tile, image, shown: "" };
      redraw(entry);
      sorted.push(entry);
    }
    for (const [foot, cells] of lines) debug.push({ cells, foot: foot + layer.y });
  }

  const follow = () => {
    for (const entry of sorted) redraw(entry);
  };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, follow);
  const removeDebug = !process.env.DEBUG_EXTRAS
    ? () => {}
    : debugExtras(scene, debug, {
        width: layer.layer.tileWidth,
        height: layer.layer.tileHeight,
      });
  const remove = () => {
    removeDebug();
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, follow);
    for (const { image } of sorted) image.destroy();
  };
  return { remove, feet };
}
