import Phaser from "phaser";
import type { Player } from "@/client/views/player";
import { feetOffsetOf } from "@/client/views/feet";
import { drawPuffArt } from "./fog-puff-art";
import { ABOVE_LAYER_DEPTH } from "./world-depths";

/** Puffs sit one per grid cell of the drifting mist, px, jittered so the grid never shows. */
const CELL = 44;
const PUFF_SIZE = 96;
const PUFF_VARIANTS = 6;
const PUFF_KEY = "fog-puffs";
/** How thick puffs are at full fog. */
const PUFF_ALPHA = 0.5;
/** Every puff lies over everything, the map's `Above` layer included, under cloud shadows and the night's light map. */
const PUFF_DEPTH = ABOVE_LAYER_DEPTH + 0.25;
/** How far round a body puffs get pushed, in body sizes, and how hard. */
const PUSH_REACH = 4.5;
const PUSH = 900;
const SPIN_PUSH = 700;
const TURN_PUSH = 1.5;
/** How puffs ease back: spring stiffness and damping per second (settles over a couple of seconds). */
const SPRING = 3;
const DAMPING = 2.6;
const TURN_EASE = 1.2;

/** How a puff has been knocked about by bodies walking through it, worked out on this screen only. */
interface Kick {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
}

/** One puff: its image, and the looks that never change while it's on screen. */
interface Puff {
  image: Phaser.GameObjects.Image;
  /** Where it rests in the drifting grid, before the wind carries it. */
  baseX: number;
  baseY: number;
  scale: number;
  alpha: number;
  tilt: number;
  turnRate: number;
}

interface Puffs {
  shown: Map<number, Puff>;
  spare: Phaser.GameObjects.Image[];
  scene: Phaser.Scene;
}

let puffs: Puffs | undefined;
const kicks = new Map<number, Kick>();

/** One number per grid cell, cheaper than a string key. */
const cellKey = (cx: number, cy: number) => (cx + 32768) * 65536 + (cy + 32768);

/** A steady 0..1 per grid cell and salt: the same for every player. */
function hash(cx: number, cy: number, salt: number) {
  const s = Math.sin(cx * 127.1 + cy * 311.7 + salt * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Every puff variant side by side in one texture, so all the puffs draw in one batch. */
function createTextures(scene: Phaser.Scene) {
  if (scene.textures.exists(PUFF_KEY)) return;
  const texture = scene.textures.createCanvas(
    PUFF_KEY,
    PUFF_SIZE * PUFF_VARIANTS,
    PUFF_SIZE,
  ) as Phaser.Textures.CanvasTexture;
  const context = texture.getContext();
  for (let variant = 0; variant < PUFF_VARIANTS; variant++) {
    const pixels = context.createImageData(PUFF_SIZE, PUFF_SIZE);
    pixels.data.set(drawPuffArt(PUFF_SIZE, variant * 17 + 5));
    context.putImageData(pixels, variant * PUFF_SIZE, 0);
    texture.add(variant, 0, variant * PUFF_SIZE, 0, PUFF_SIZE, PUFF_SIZE);
  }
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  texture.refresh();
}

function puffsOf(scene: Phaser.Scene) {
  if (puffs?.scene === scene) return puffs;
  createTextures(scene);
  puffs = { shown: new Map(), spare: [], scene };
  scene.events.once("shutdown", () => {
    puffs = undefined;
    kicks.clear();
  });
  return puffs;
}

/** Forgets every knock, as on a new map. */
export function clearPuffKicks() {
  kicks.clear();
}

/** Sets up a puff for a cell coming into view, on a spare image if there is one. */
function showPuff(
  scene: Phaser.Scene & { minimap?: Phaser.Cameras.Scene2D.Camera },
  state: Puffs,
  cx: number,
  cy: number,
): Puff {
  let image = state.spare.pop();
  if (!image) {
    image = scene.add.image(0, 0, PUFF_KEY, 0);
    scene.minimap?.ignore(image);
  }
  const scale = ((CELL * 2.1) / PUFF_SIZE) * (0.75 + hash(cx, cy, 4) * 0.8);
  const shade = 0.82 + hash(cx, cy, 5) * 0.18;
  image
    .setTexture(PUFF_KEY, Math.floor(hash(cx, cy, 7) * PUFF_VARIANTS))
    .setScale(scale * 1.35, scale * 0.75)
    .setTint(Phaser.Display.Color.GetColor(shade * 255, shade * 255, Math.min(255, shade * 262)))
    .setDepth(PUFF_DEPTH)
    .setVisible(true);
  return {
    image,
    baseX: cx * CELL + hash(cx, cy, 1) * CELL,
    baseY: cy * CELL + hash(cx, cy, 2) * CELL,
    scale,
    alpha: 0.55 + hash(cx, cy, 3) * 0.45,
    tilt: hash(cx, cy, 8) * 0.16 - 0.08,
    turnRate: (hash(cx, cy, 6) - 0.5) * 0.02,
  };
}

/**
 * Pushes and spins the puffs round each body walking through them, and eases them all back. Only
 * the cells round each body are looked at.
 */
function stepKicks(state: Puffs, bodies: Player[], drift: { x: number; y: number }, delta: number) {
  const seconds = Math.min(delta, 50) / 1000;
  for (const body of bodies) {
    if (body.state?.isDead || body.habitat === "air" || !(body.currentSpeed > 0)) continue;
    const size = (body.profile?.scale || 1) * Math.max(8, body.bodySize ?? 8);
    const reach = size * PUSH_REACH;
    const feetX = body.x;
    const feetY = body.y + feetOffsetOf(body);
    const velocity = body.body?.velocity ?? { x: 0, y: 0 };
    const speed = Math.hypot(velocity.x, velocity.y) || 1;
    const fromX = Math.floor((feetX - reach - drift.x) / CELL) - 1;
    const toX = Math.floor((feetX + reach - drift.x) / CELL);
    const fromY = Math.floor((feetY - reach - drift.y) / CELL) - 1;
    const toY = Math.floor((feetY + reach - drift.y) / CELL);
    for (let cy = fromY; cy <= toY; cy++) {
      for (let cx = fromX; cx <= toX; cx++) {
        const key = cellKey(cx, cy);
        const puff = state.shown.get(key);
        if (!puff) continue;
        const kick = kicks.get(key);
        const dx = puff.baseX + drift.x + (kick?.x ?? 0) - feetX;
        const dy = puff.baseY + drift.y + (kick?.y ?? 0) - feetY;
        const distance = Math.hypot(dx, dy);
        if (distance > reach) continue;
        const near = 1 - distance / reach;
        const ax = dx / (distance || 1);
        const ay = dy / (distance || 1);
        /* Which side of the body's path it's on decides which way it swirls round */
        const side = Math.sign((velocity.x * dy - velocity.y * dx) / speed) || 1;
        const strength = near * near * seconds * Math.min(1, speed / 60);
        const next = kick ?? { x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0 };
        next.vx += (ax * PUSH - ay * side * SPIN_PUSH) * strength;
        next.vy += (ay * PUSH + ax * side * SPIN_PUSH) * strength;
        next.spin += side * TURN_PUSH * strength;
        kicks.set(key, next);
      }
    }
  }
  for (const [key, kick] of kicks) {
    kick.vx += (-SPRING * kick.x - DAMPING * kick.vx) * seconds;
    kick.vy += (-SPRING * kick.y - DAMPING * kick.vy) * seconds;
    kick.x += kick.vx * seconds;
    kick.y += kick.vy * seconds;
    kick.spin -= kick.spin * DAMPING * seconds + kick.angle * TURN_EASE * seconds;
    kick.angle += kick.spin * seconds;
    const still = Math.abs(kick.x) + Math.abs(kick.y) + Math.abs(kick.vx) + Math.abs(kick.vy);
    const settled = still < 0.05 && Math.abs(kick.angle) + Math.abs(kick.spin) < 0.002;
    if (settled || !state.shown.has(key)) kicks.delete(key);
  }
}

interface PuffView {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Where the wind has carried the mist, px. */
  drift: { x: number; y: number };
  /** World time, s, for each puff's slow turn. */
  time: number;
  thickness: number;
  bodies: Player[];
  delta: number;
}

/**
 * Lays hundreds of soft puffs over the view. Where each sits, its size, shade and slow turn come
 * from the drifting world grid, so every player sees the same mist; all of them lie over
 * the whole world, tree tops and roofs included. A puff keeps its image while
 * it's in view, so only what moves is set each frame.
 */
export function drawPuffs(
  scene: Phaser.Scene & { minimap?: Phaser.Cameras.Scene2D.Camera },
  view: PuffView,
) {
  const state = puffsOf(scene);
  const { drift } = view;
  const wanted = new Set<number>();
  if (view.thickness > 0) {
    const firstX = Math.floor((view.left - drift.x) / CELL) - 1;
    const firstY = Math.floor((view.top - drift.y) / CELL) - 1;
    const lastX = Math.ceil((view.left + view.width - drift.x) / CELL) + 1;
    const lastY = Math.ceil((view.top + view.height - drift.y) / CELL) + 1;
    for (let cy = firstY; cy <= lastY; cy++) {
      for (let cx = firstX; cx <= lastX; cx++) {
        /* Some cells are left bare, so the puffs bunch into banks */
        if (hash(cx, cy, 3) < 0.15) continue;
        const key = cellKey(cx, cy);
        wanted.add(key);
        if (!state.shown.has(key)) state.shown.set(key, showPuff(scene, state, cx, cy));
      }
    }
  }
  for (const [key, puff] of state.shown) {
    if (wanted.has(key)) continue;
    puff.image.setVisible(false);
    state.spare.push(puff.image);
    state.shown.delete(key);
  }
  if (state.shown.size === 0) return;
  stepKicks(state, view.bodies, drift, view.delta);
  for (const [key, puff] of state.shown) {
    const kick = kicks.get(key);
    puff.image.x = puff.baseX + drift.x + (kick?.x ?? 0);
    puff.image.y = puff.baseY + drift.y + (kick?.y ?? 0);
    puff.image.rotation = puff.tilt + puff.turnRate * view.time + (kick?.angle ?? 0) * 0.3;
    puff.image.alpha = PUFF_ALPHA * view.thickness * puff.alpha;
  }
}
