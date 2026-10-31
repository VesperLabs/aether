import Phaser from "phaser";
import { MINI_MAP_MARGIN, MINI_MAP_SIZE } from "@/client/views/minimap-size";
import type { Player } from "@/client/views/player";
import { getNpcs, getPlayers } from "./scene-entities";
import type { SceneMain } from "./main-scene";

const MASK_KEY = "minimap-mask";
const ZOOM = 0.25;
/** Dot radius in screen pixels; divided by zoom to get world units. */
const DOT_RADIUS = 2.5;
const HERO_COLOR = 0xfff3c4;
const PLAYER_COLOR = 0x60a5fa;
const NPC_COLOR = 0xef4444;

let dots: Phaser.GameObjects.Graphics | undefined;

export function createMinimap(scene: SceneMain) {
  const minimap = scene.cameras.add(0, 0, MINI_MAP_SIZE, MINI_MAP_SIZE);
  if (!scene.textures.exists(MASK_KEY)) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(0xffffff).fillCircle(MINI_MAP_SIZE / 2, MINI_MAP_SIZE / 2, MINI_MAP_SIZE / 2);
    g.generateTexture(MASK_KEY, MINI_MAP_SIZE, MINI_MAP_SIZE);
    g.destroy();
  }
  minimap.filters.internal.addMask(MASK_KEY);
  minimap.setBackgroundColor(0x1c130c);

  dots = scene.add.graphics().setDepth(100000);
  scene.cameras.main.ignore(dots);
  scene.events.once("shutdown", () => {
    dots = undefined;
  });
  return minimap;
}

export function layoutMinimap(scene: SceneMain, hero: Player) {
  const { minimap } = scene;
  if (!minimap || !scene.map) return;
  minimap.setVisible(scene.userSettings?.showMinimap);
  minimap.setPosition(
    Math.round(scene.scale.width - MINI_MAP_SIZE - MINI_MAP_MARGIN),
    MINI_MAP_MARGIN,
  );
  minimap.setBounds(0, 0, scene.map.widthInPixels, scene.map.heightInPixels);
  minimap.setZoom(ZOOM);
  minimap.startFollow(hero, true, 0.5, 0.5, 0, 0);
}

/** Keep the minimap to tiles plus dots: hide every other object from it, then redraw the dots. */
export function updateMinimap(scene: SceneMain) {
  const { minimap } = scene;
  if (!minimap?.visible || !dots) return;

  for (const obj of scene.children.list) {
    if (obj === dots || obj instanceof Phaser.Tilemaps.TilemapLayer) continue;
    if ((obj.cameraFilter & minimap.id) === 0) minimap.ignore(obj);
  }

  const r = DOT_RADIUS / ZOOM;
  dots.clear();
  dots.fillStyle(NPC_COLOR);
  for (const npc of getNpcs(scene)) {
    if (!npc.state?.isDead) dots.fillCircle(npc.x, npc.y, r);
  }
  for (const player of getPlayers(scene)) {
    if (player.state?.isDead) continue;
    dots.fillStyle(player.isHero ? HERO_COLOR : PLAYER_COLOR);
    dots.fillCircle(player.x, player.y, player.isHero ? r * 1.4 : r);
  }
}
