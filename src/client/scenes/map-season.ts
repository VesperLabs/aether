import { getMapByName, type Season } from "@/content";
import { mapSeason } from "@/rules/seasons";
import type { SceneMain } from "./main-scene";
import { announceSeason } from "./world-clock";
import { fadeMapChange } from "./season-fade";
import { whenTexturesLoaded } from "./tileset-textures";

/**
 * The texture a tileset draws with in the current room's season: its seasonal copy
 * (`tileset-grassland` → `tileset-grassland-fall`) when one is loaded, else its base (summer) art.
 */
export function seasonalTilesetKey(scene: SceneMain, tilesetName: string): string {
  const season: Season = mapSeason(getMapByName(scene.roomName)?.seasons, scene.season);
  const key = `${tilesetName}-${season}`;
  return season !== "summer" && scene.textures.exists(key) ? key : tilesetName;
}

/**
 * Redraws the current map's tilesets for the season the world just turned to, fading over. Waits for
 * that season's art to download first, so the fade always runs from one finished look to the next.
 */
export function changeSeason(scene: SceneMain, worldSeason: Season) {
  scene.season = worldSeason;
  announceSeason(worldSeason);
  const { map } = scene;
  if (!map) return;
  const season = mapSeason(getMapByName(scene.roomName)?.seasons, worldSeason);
  const seasonal = map.tilesets.map((tileset) => `${tileset.name}-${season}`);
  whenTexturesLoaded(scene, season === "summer" ? [] : seasonal, () => {
    /* Left the room, or the season turned again (that change fades in its own time) */
    if (scene.map !== map || scene.season !== worldSeason) return;
    const before = map.tilesets.map((tileset) => tileset.image?.key);
    const after = map.tilesets.map((tileset) => seasonalTilesetKey(scene, tileset.name));
    /* Maps with a fixed season (or none) look the same: nothing to fade */
    if (after.every((key, i) => key === before[i])) return;
    fadeMapChange(scene, () => {
      /* A room change during the frame's wait brought its own map, already in the new season */
      if (scene.map !== map) return;
      map.tilesets.forEach((tileset, i) => tileset.setImage(scene.textures.get(after[i])));
    });
  });
}
