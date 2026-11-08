import Phaser from "phaser";
import {
  MINI_MAP_CLOSE_MS,
  MINI_MAP_MARGIN,
  MINI_MAP_OPEN_MS,
  MINI_MAP_OPEN_VAR,
  MINI_MAP_SIZE,
} from "@/client/views/minimap-size";
import type { Player } from "@/client/views/player";
import { getNpcs, getPlayers } from "./scene-entities";
import type { SceneMain } from "./main-scene";

const MASK_KEY = "minimap-mask";
const ZOOM = 0.25;
/** Dot radius in screen pixels, not counting its 1px outline. */
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

/** Companions party blue, talkers green, others amber when they only fight back and red when they attack on sight. */
const npcColor = (npc: Player) => {
  if (npc.state?.ownerId) return PARTY_COLOR;
  if (npc.talks) return KEEPER_COLOR;
  return npc.behaviors?.includes("aggressive") ? AGGRESSIVE_COLOR : PASSIVE_COLOR;
};

/** Dot textures are drawn this many times sharper than they show, then scaled down smoothly. */
const SUPERSAMPLE = 4;

/**
 * A smooth, outlined dot of `color` as its own texture. Canvas arcs are antialiased, and the
 * texture filters linearly, so dots stay round even though the game renders as pixel art.
 */
function dotTexture(scene: SceneMain, color: number) {
  const key = `minimap-dot-${color.toString(16)}`;
  if (scene.textures.exists(key)) return key;
  const size = Math.ceil((DOT_RADIUS + 1) * 2 * SUPERSAMPLE);
  const texture = scene.textures.createCanvas(key, size, size);
  const ctx = texture?.getContext();
  if (!texture || !ctx) return key;
  const centre = size / 2;
  ctx.fillStyle = `#${OUTLINE_COLOR.toString(16).padStart(6, "0")}`;
  ctx.beginPath();
  ctx.arc(centre, centre, centre, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.beginPath();
  ctx.arc(centre, centre, centre - SUPERSAMPLE, 0, Math.PI * 2);
  ctx.fill();
  texture.refresh();
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return key;
}

let dots: Phaser.GameObjects.Container | undefined;

/** Shows the `index`th dot, reusing last frame's images. */
function placeDot(scene: SceneMain, index: number, x: number, y: number, color: number, size = 1) {
  if (!dots) return;
  let dot = dots.list[index] as Phaser.GameObjects.Image | undefined;
  if (!dot) {
    dot = scene.add.image(0, 0, dotTexture(scene, color));
    dots.add(dot);
  }
  dot.setTexture(dotTexture(scene, color));
  dot
    .setPosition(x, y)
    .setScale(size / (SUPERSAMPLE * ZOOM))
    .setVisible(true);
}

export function createMinimap(scene: SceneMain) {
  // Hidden until layoutMinimap places it, or it flashes top-left while loading
  const minimap = scene.cameras.add(0, 0, MINI_MAP_SIZE, MINI_MAP_SIZE).setVisible(false);
  if (!scene.textures.exists(MASK_KEY)) {
    scene.textures.createCanvas(MASK_KEY, MINI_MAP_SIZE, MINI_MAP_SIZE);
    drawMask(scene, 1);
  }
  minimap.filters.internal.addMask(MASK_KEY);
  minimap.setBackgroundColor(0x1c130c);

  dots = scene.add.container(0, 0).setDepth(100000);
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
  publishOpenness(scene.userSettings?.showMinimap ? 1 : 0);
  minimap.setPosition(
    Math.round(scene.scale.width - MINI_MAP_SIZE - MINI_MAP_MARGIN),
    MINI_MAP_MARGIN,
  );
  minimap.setBounds(0, 0, scene.map.widthInPixels, scene.map.heightInPixels);
  minimap.setZoom(ZOOM);
  minimap.startFollow(hero, true, 0.5, 0.5, 0, 0);
}

/** How open the minimap is, 0 to 1. Kept across tweens, so a quick re-toggle turns back smoothly. */
const openness = { value: 1 };

/* The camera itself stays put: resizing a following, masked camera every frame makes it jump.
   Only its circular mask changes, redrawn at this radius. */
function drawMask(scene: SceneMain, openFraction: number) {
  const mask = scene.textures.get(MASK_KEY) as Phaser.Textures.CanvasTexture;
  const ctx = mask.getContext();
  const centre = MINI_MAP_SIZE / 2;
  ctx.clearRect(0, 0, MINI_MAP_SIZE, MINI_MAP_SIZE);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(centre, centre, centre * openFraction, 0, Math.PI * 2);
  ctx.fill();
  mask.refresh();
}

const publishOpenness = (value: number) =>
  document.documentElement.style.setProperty(MINI_MAP_OPEN_VAR, String(value));

function applyOpenness(scene: SceneMain, minimap: Phaser.Cameras.Scene2D.Camera) {
  drawMask(scene, openness.value);
  publishOpenness(openness.value);
  minimap.setAlpha(openness.value);
}

/** Grows the minimap out of its centre, or shrinks it away. */
export function animateMinimap(scene: SceneMain, show: boolean) {
  const { minimap } = scene;
  if (!minimap) return;
  scene.tweens.killTweensOf(openness);
  if (show) {
    /* Closed before it shows, or the first frame is the whole minimap */
    if (!minimap.visible) {
      openness.value = 0;
      applyOpenness(scene, minimap);
    }
    minimap.setVisible(true);
  }
  scene.tweens.add({
    targets: openness,
    value: show ? 1 : 0,
    duration: show ? MINI_MAP_OPEN_MS : MINI_MAP_CLOSE_MS,
    ease: "Sine.easeInOut",
    onUpdate: () => applyOpenness(scene, minimap),
    onComplete: () => {
      if (!show) minimap.setVisible(false);
      /* Back to full size, so a later layout or reveal starts from a whole minimap */
      openness.value = 1;
      applyOpenness(scene, minimap);
      publishOpenness(show ? 1 : 0);
    },
  });
}

/** Keep the minimap to tiles plus dots: hide every other object from it, then redraw the dots. */
export function updateMinimap(scene: SceneMain) {
  const { minimap } = scene;
  if (!minimap?.visible || !dots) return;

  for (const obj of scene.children.list) {
    if (obj === dots || obj instanceof Phaser.Tilemaps.TilemapLayer) continue;
    if ((obj.cameraFilter & minimap.id) === 0) minimap.ignore(obj);
  }

  let count = 0;
  for (const npc of getNpcs(scene)) {
    if (!npc.state?.isDead) placeDot(scene, count++, npc.x, npc.y, npcColor(npc));
  }
  // Players last, so they sit on top of the mobs around them
  const hero = getPlayers(scene).find((player) => player.isHero);
  const partyIds = new Set(hero?.party?.members?.map((member: { id: string }) => member.id));
  for (const player of getPlayers(scene)) {
    if (player.state?.isDead) continue;
    const color = player.isHero ? HERO_COLOR : partyIds.has(player.id) ? PARTY_COLOR : PLAYER_COLOR;
    placeDot(scene, count++, player.x, player.y, color, player.isHero ? 1.4 : 1);
  }
  // Hide the spares left over from a busier frame
  for (let i = count; i < dots.list.length; i++) {
    (dots.list[i] as Phaser.GameObjects.Image).setVisible(false);
  }
}
