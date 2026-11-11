/**
 * Maps share their tilesets: each map lists `{ firstgid, source }` pointing at a `.tsj` file in
 * `public/assets/tilesets`, so an animation or a tile's properties are set once, in Tiled, for
 * every map. Phaser and the server only read tilesets inside the map, so whoever loads a map
 * reads its tilesets too and puts them back in with `inlineTilesets`.
 */

/** A tileset as a map lists it: inside the map, or by `source` in a shared file. */
interface MapTileset {
  firstgid: number;
  source?: string;
}

/** A shared tileset file (`.tsj`), as Tiled writes it. */
export type TilesetFile = Record<string, unknown> & { image?: string };

/**
 * `path` with `.` and `..` parts worked out, always with `/`. What it starts from is kept: a
 * leading `/`, or a URL's `https://host` (the wiki loads maps from a CDN in production).
 */
function normalize(path: string) {
  const root = /^[a-z]+:\/\/[^/]+\/|^\//i.exec(path)?.[0] ?? "";
  const parts: string[] = [];
  for (const part of path.slice(root.length).split("/")) {
    if (part === "..") parts.pop();
    else if (part !== "." && part !== "") parts.push(part);
  }
  return root + parts.join("/");
}

const folderOf = (path: string) => path.slice(0, path.lastIndexOf("/") + 1);

/** `to` written relative to the folder `from`, both normalized. */
function relative(from: string, to: string) {
  const a = normalize(from).split("/").filter(Boolean);
  const b = normalize(to).split("/").filter(Boolean);
  let same = 0;
  while (same < a.length && same < b.length - 1 && a[same] === b[same]) same++;
  return [...a.slice(same).map(() => ".."), ...b.slice(same)].join("/");
}

/** Where a map's tileset file is, from the map's own path (`assets/tilemaps/town.json`). */
export const tilesetPath = (mapPath: string, source: string) =>
  normalize(folderOf(mapPath) + source);

/** The shared tileset files a map needs, as paths like the map's. */
export function tilesetSources(map: { tilesets: readonly MapTileset[] }, mapPath: string) {
  const sources = map.tilesets.flatMap((tileset) => (tileset.source ? [tileset.source] : []));
  return [...new Set(sources.map((source) => tilesetPath(mapPath, source)))];
}

/**
 * The map with every shared tileset put back inside it, as Tiled would have embedded it: the
 * file's fields with the map's `firstgid`, and its image path made relative to the map again.
 * `files` holds each file by `tilesetPath`; a missing one is an error, never a silent blank map.
 */
export function inlineTilesets<Map extends { tilesets: readonly MapTileset[] }>(
  map: Map,
  mapPath: string,
  files: Readonly<Record<string, TilesetFile>>,
): Map {
  const tilesets = map.tilesets.map((tileset) => {
    if (!tileset.source) return tileset;
    const path = tilesetPath(mapPath, tileset.source);
    const file = files[path];
    if (!file) throw new Error(`Map ${mapPath} needs the tileset ${path}, which wasn't loaded`);
    const image = file.image && relative(folderOf(mapPath), folderOf(path) + file.image);
    return { ...file, ...(image ? { image } : {}), firstgid: tileset.firstgid } as MapTileset;
  });
  return { ...map, tilesets };
}

/** A map read with `read`, its shared tilesets read the same way and put back in. */
export function readMapWithTilesets<Map extends { tilesets: readonly MapTileset[] }>(
  mapPath: string,
  read: (path: string) => unknown,
): Map {
  const map = read(mapPath) as Map;
  const files = Object.fromEntries(
    tilesetSources(map, mapPath).map((path) => [path, read(path) as TilesetFile]),
  );
  return inlineTilesets(map, mapPath, files);
}

/** `readMapWithTilesets` for a `fetch`: the map, then its shared tilesets all at once. */
export async function fetchMapWithTilesets<Map extends { tilesets: readonly MapTileset[] }>(
  mapPath: string,
  fetchJson: (path: string) => Promise<unknown>,
): Promise<Map> {
  const map = (await fetchJson(mapPath)) as Map;
  const paths = tilesetSources(map, mapPath);
  const files = await Promise.all(paths.map((path) => fetchJson(path)));
  return inlineTilesets(
    map,
    mapPath,
    Object.fromEntries(paths.map((path, i) => [path, files[i] as TilesetFile])),
  );
}
