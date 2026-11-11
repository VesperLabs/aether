import Phaser from "phaser";
import { mapList } from "@/content";
import { inlineTilesets, tilesetSources, type TilesetFile } from "@/rules/movement";

const mapKey = (name: string) => `map:${name}`;
const tilesetKey = (path: string) => `tileset:${path}`;

/**
 * Queues every map's JSON, and as each arrives, the shared tileset files it lists (each once).
 * `addLoadedMaps` then puts them together once everything has loaded.
 */
export function loadMaps(scene: Phaser.Scene, assetUrl: (src: string) => string) {
  const queued = new Set<string>();
  for (const { name, json } of mapList) {
    scene.load.json(mapKey(name), assetUrl(json));
    scene.load.once(
      `filecomplete-json-${mapKey(name)}`,
      (_key: string, _type: string, map: never) => {
        for (const path of tilesetSources(map, json)) {
          if (queued.has(path)) continue;
          queued.add(path);
          scene.load.json(tilesetKey(path), assetUrl(`./${path}`));
        }
      },
    );
  }
}

/** Puts each loaded map together with its shared tilesets, as the tilemap Phaser makes rooms from. */
export function addLoadedMaps(scene: Phaser.Scene) {
  for (const { name, json } of mapList) {
    const map = scene.cache.json.get(mapKey(name));
    const files: Record<string, TilesetFile> = {};
    for (const path of tilesetSources(map, json))
      files[path] = scene.cache.json.get(tilesetKey(path));
    scene.cache.tilemap.add(name, {
      format: Phaser.Tilemaps.Formats.TILED_JSON,
      data: inlineTilesets(map, json, files),
    });
  }
}
