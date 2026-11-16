import { getMapByName } from "@/content";
import { mapSeason } from "@/rules/seasons";
import { isSandyAt, isSnowyAt, isWaterAt } from "@/client/scenes/ground-terrain";
import { GROUND_MARKS_DEPTH } from "@/client/scenes/world-depths";
import type { Player } from "./player";
import { feetOffsetOf } from "./feet";
import { restingSizeOf } from "./body-extent";

/**
 * Prints are sized from how big the body's art is (`restingSizeOf`), as shares of it: how far apart
 * steps land, how far each foot sits from the middle, and a print's length and width.
 */
const STRIDE_SHARE = 0.42;
const SPREAD_SHARE = 0.11;
const LENGTH_SHARE = 0.22;
const WIDTH_SHARE = 0.16;
/** For a body whose art can't be measured yet: its size, px at scale 1 (a human's). */
const FALLBACK_SIZE = 31;
/**
 * How a print is shaded, pressed into the ground and lit from above: the upper wall of the dent is
 * in shadow, the lower wall catches the light, and the floor is a touch darker than the ground around it.
 */
interface PrintShades {
  shadow: number;
  shadowAlpha: number;
  sideAlpha: number;
  light: number;
  lightAlpha: number;
  floor: number;
  floorAlpha: number;
}

const SNOW_SHADES: PrintShades = {
  shadow: 0x6f88ab,
  shadowAlpha: 0.3,
  sideAlpha: 0.18,
  light: 0xffffff,
  lightAlpha: 0.45,
  floor: 0xa9bdd6,
  floorAlpha: 0.14,
};

const SAND_SHADES: PrintShades = {
  shadow: 0x8a5a2b,
  shadowAlpha: 0.3,
  sideAlpha: 0.18,
  light: 0xfff1c9,
  lightAlpha: 0.35,
  floor: 0xb98a55,
  floorAlpha: 0.16,
};
/** A print stays this long, then fades away over `FADE_MS`. */
const HOLD_MS = 500;
const FADE_MS = 700;
/** The most prints in the world at once; the oldest goes first, so a crowd can't pile them up. */
const MAX_PRINTS = 300;

interface Tracks {
  lastX: number;
  lastY: number;
  leftFoot: boolean;
}

const tracks = new WeakMap<Player, Tracks>();
const prints: Phaser.GameObjects.Graphics[] = [];

/** Does the room show winter now: a winter map, or one that follows the world into winter? */
function showsWinter(player: Player) {
  const { scene } = player;
  return mapSeason(getMapByName(scene.roomName)?.seasons, scene.season) === "winter";
}

/** How big the body is drawn, px: its art at its scale, or a stand-in until it can be measured. */
function bodySizeOf(player: Player) {
  const size = restingSizeOf(player.skin);
  if (size) return size * Math.abs(player.skin.scaleX);
  return FALLBACK_SIZE * (player.profile?.scale || 1);
}

const key = (x: number, y: number) => `${x},${y}`;

/**
 * How wide a print is at `t` along it (0 at the front, 1 at the back), as a share of its width:
 * an egg, a little fuller at the front, so it reads as any foot, boot, paw or claw.
 */
function printWidthAt(t: number) {
  const round = Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));
  return round * (1.08 - 0.2 * t);
}

/**
 * A print, as (along, across) pixel offsets from its middle, `along` pointing the way it walks.
 * The same size whichever way it points.
 */
function printPixels(length: number, width: number) {
  const inside = (i: number, j: number) =>
    i >= 0 &&
    i < length &&
    Math.abs(j + 0.5 - width / 2) <= (printWidthAt((i + 0.5) / length) * width) / 2 + 0.1;
  const pixels: [number, number][] = [];
  for (let i = 0; i < length; i++) {
    for (let j = 0; j < width; j++) {
      if (inside(i, j)) pixels.push([Math.floor(length / 2) - i, j - Math.floor(width / 2)]);
    }
  }
  return pixels;
}

/** One print where a foot lands, pointing the way it walks, that holds and then fades out. */
function stamp(
  player: Player,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  size: number,
  shades: PrintShades,
) {
  const length = Math.max(4, Math.round(size * LENGTH_SHARE));
  const width = Math.max(2, Math.round(size * WIDTH_SHARE));
  /* Pixel art walks on the grid: the boot points along the nearer axis */
  const [ax, ay] = Math.abs(dirX) > Math.abs(dirY) ? [Math.sign(dirX), 0] : [0, Math.sign(dirY)];
  const print = player.scene.add
    .graphics({ x: Math.round(x), y: Math.round(y) })
    .setDepth(GROUND_MARKS_DEPTH);
  /* Shaded on screen, after turning, so the light always comes from above */
  const cells = new Set(
    printPixels(length, width).map(([along, across]) =>
      key(along * ax - across * ay, along * ay + across * ax),
    ),
  );
  for (const cell of cells) {
    const [px, py] = cell.split(",").map(Number);
    const has = (dx: number, dy: number) => cells.has(key(px + dx, py + dy));
    const [color, alpha] = !has(0, -1)
      ? [shades.shadow, shades.shadowAlpha]
      : !has(0, 1)
        ? [shades.light, shades.lightAlpha]
        : !has(-1, 0) || !has(1, 0)
          ? [shades.shadow, shades.sideAlpha]
          : [shades.floor, shades.floorAlpha];
    print.fillStyle(color, alpha);
    print.fillRect(px, py, 1, 1);
  }
  prints.push(print);
  if (prints.length > MAX_PRINTS) prints.shift()?.destroy();
  player.scene.tweens.add({
    targets: print,
    alpha: 0,
    delay: HOLD_MS,
    duration: FADE_MS,
    onComplete: () => {
      prints.splice(prints.indexOf(print), 1);
      print.destroy();
    },
  });
}

/**
 * Leaves footprints in snow and sand as a body walks: one every stride, left and right in turn, sized
 * to how big the body is drawn, fading soon after. In sand always; in snow only where the room shows
 * winter, on ground painted snowy. Never in water.
 */
export function updateFootprints(player: Player) {
  const track = tracks.get(player);
  if (!track) {
    tracks.set(player, { lastX: player.x, lastY: player.y, leftFoot: false });
    return;
  }
  const dx = player.x - track.lastX;
  const dy = player.y - track.lastY;
  const moved = Math.hypot(dx, dy);
  const size = bodySizeOf(player);
  const stride = Math.max(3, size * STRIDE_SHARE);
  if (moved < stride) return;
  track.lastX = player.x;
  track.lastY = player.y;
  /* A jump across the map (a door, a teleport) leaves no trail */
  if (moved > stride * 4 || player.state.isDead || player.habitat === "air") return;
  const feetY = player.y + player.rig.y + feetOffsetOf(player);
  const { map } = player.scene;
  if (isWaterAt(map, player.x, player.y)) return;
  const shades = isSandyAt(map, player.x, feetY)
    ? SAND_SHADES
    : showsWinter(player) && isSnowyAt(map, player.x, feetY)
      ? SNOW_SHADES
      : undefined;
  if (!shades) return;
  const dirX = dx / moved;
  const dirY = dy / moved;
  /* Each foot to its side of the way it walks */
  const side = (track.leftFoot ? -1 : 1) * Math.max(1, size * SPREAD_SHARE);
  stamp(player, player.x - dirY * side, feetY + dirX * side, dirX, dirY, size, shades);
  track.leftFoot = !track.leftFoot;
}
