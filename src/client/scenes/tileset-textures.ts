import Phaser from "phaser";
import { mapImageList, SEASONS, type Season } from "@/content";
import { assetUrl } from "./asset-url";

/**
 * Tileset art is most of what the game downloads, so boot loads none of it: each room waits only for
 * its own tilesets, and seasonal copies load after, in the background.
 */
const IMAGES = new Map<string, string>(mapImageList.map(({ name, image }) => [name, image]));

/** The texture keys (Tiled names) of the tilesets a room's map draws with. */
export function roomTilesetKeys(scene: Phaser.Scene, roomName: string): string[] {
  const data = scene.cache.tilemap.get(roomName)?.data as { tilesets?: { name: string }[] };
  return (data?.tilesets ?? []).map(({ name }) => name).filter((name) => IMAGES.has(name));
}

/** Calls `onReady` once every texture in `keys` is loaded (or failed), right away if they all are. */
export function whenTexturesLoaded(scene: Phaser.Scene, keys: string[], onReady: () => void) {
  const pending = new Set(keys.filter((key) => IMAGES.has(key) && !scene.textures.exists(key)));
  if (!pending.size) return onReady();
  const { load } = scene;
  const settle = (key: string) => {
    if (!pending.delete(key) || pending.size) return;
    load.off(Phaser.Loader.Events.FILE_COMPLETE, onFile);
    load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
    onReady();
  };
  const onFile = (key: string) => settle(key);
  const onError = (file: Phaser.Loader.File) => settle(file.key);
  load.on(Phaser.Loader.Events.FILE_COMPLETE, onFile);
  load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
  queueTextures(scene, [...pending]);
}

/** Starts loading `keys` (already loaded or queued ones are skipped by the loader). */
function queueTextures(scene: Phaser.Scene, keys: string[]) {
  const missing = keys.filter((key) => IMAGES.has(key) && !scene.textures.exists(key));
  if (!missing.length) return;
  for (const key of missing) scene.load.image(key, assetUrl(IMAGES.get(key) as string));
  if (!scene.load.isLoading()) scene.load.start();
}

/** Every base (summer) tileset, so later rooms are already there by the time anyone walks in. */
export function prefetchBaseTilesets(scene: Phaser.Scene) {
  queueTextures(
    scene,
    [...IMAGES.keys()].filter(
      (key) => !SEASONS.some((season) => season !== "summer" && key.endsWith(`-${season}`)),
    ),
  );
}

/** Every tileset's copy for `season`. */
export function prefetchSeason(scene: Phaser.Scene, season: Season) {
  if (season === "summer") return;
  queueTextures(
    scene,
    [...IMAGES.keys()].filter((key) => key.endsWith(`-${season}`)),
  );
}
