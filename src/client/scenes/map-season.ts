import { getMapByName, type Season } from "@/content";
import { mapSeason } from "@/rules/seasons";
import type { SceneMain } from "./main-scene";

/**
 * The texture a tileset draws with in the current room's season: its seasonal copy
 * (`tileset-grassland` → `tileset-grassland-fall`) when one is loaded, else its base (summer) art.
 */
export function seasonalTilesetKey(scene: SceneMain, tilesetName: string): string {
  const season: Season = mapSeason(getMapByName(scene.roomName)?.seasons, scene.season);
  const key = `${tilesetName}-${season}`;
  return season !== "summer" && scene.textures.exists(key) ? key : tilesetName;
}

/** Redraws the current map's tilesets for the season the world just turned to. */
export function changeSeason(scene: SceneMain, season: Season) {
  scene.season = season;
  if (!scene.map) return;
  for (const tileset of scene.map.tilesets) {
    tileset.setImage(scene.textures.get(seasonalTilesetKey(scene, tileset.name)));
  }
}
