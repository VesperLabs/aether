import Phaser from "phaser";
import { MINI_MAP_MARGIN, MINI_MAP_SIZE } from "@/client/views/minimap-size";
import type { Player } from "@/client/views/player";
import { getNpcs, getPlayers } from "./scene-entities";
import type { SceneMain } from "./main-scene";

const MASK_KEY = "minimap-mask";
const ZOOM = 0.25;
/** Dot radius in screen pixels; divided by zoom to get world units. */
const DOT_RADIUS = 2.25;
/** A dark ring around every dot so it reads on any tile. */
const OUTLINE_COLOR = 0x0b0704;
/** Friendly to hostile: you, your party, other players, keepers, mobs that leave you be, mobs that don't. */
const HERO_COLOR = 0xffffff;
const PARTY_COLOR = 0x22d3ee;
const PLAYER_COLOR = 0x3b82f6;
const KEEPER_COLOR = 0x22c55e;
const PASSIVE_COLOR = 0xf59e0b;
const AGGRESSIVE_COLOR = 0xef4444;

/** Keepers green, mobs amber when they only fight back and red when they attack on sight. */
const npcColor = (npc: Player) => {
  if (npc.kind === "keeper") return KEEPER_COLOR;
  return npc.behaviors?.includes("aggressive") ? AGGRESSIVE_COLOR : PASSIVE_COLOR;
};

function drawDot(x: number, y: number, radius: number, color: number) {
  dots?.fillStyle(OUTLINE_COLOR).fillCircle(x, y, radius + 1 / ZOOM);
  dots?.fillStyle(color).fillCircle(x, y, radius);
}

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
  for (const npc of getNpcs(scene)) {
    if (!npc.state?.isDead) drawDot(npc.x, npc.y, r, npcColor(npc));
  }
  // Players last, so they sit on top of the mobs around them
  const hero = getPlayers(scene).find((player) => player.isHero);
  const partyIds = new Set(hero?.party?.members?.map((member: { id: string }) => member.id));
  for (const player of getPlayers(scene)) {
    if (player.state?.isDead) continue;
    if (player.isHero) drawDot(player.x, player.y, r * 1.4, HERO_COLOR);
    else drawDot(player.x, player.y, r, partyIds.has(player.id) ? PARTY_COLOR : PLAYER_COLOR);
  }
}
