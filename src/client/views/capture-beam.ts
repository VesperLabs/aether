import Phaser from "phaser";
import { characterHitBox } from "@/rules/spells";
import type { Point } from "@/rules/world";
import { snapshotBody } from "./dissolve";
import type { Player } from "./player";

/** How long the body glows before it is pulled in, in ms. */
const GLOW_MS = 220;
/** How long the body takes to shrink into the ball, in ms. */
const PULL_MS = 380;
/** The whole flash, in ms. */
const FLASH_MS = GLOW_MS + PULL_MS;
/** Share of the flash before it starts to fade. */
const FLASH_FADE_SHARE = 0.55;
/** Share of the flash spent swelling to full size. */
const SWELL_SHARE = 0.35;
/** When the flash is at its biggest, in ms. */
export const FLASH_PEAK_MS = FLASH_MS * SWELL_SHARE;
/** The starburst texture, drawn once and shared by every catch. */
const RAYS_TEXTURE = "capture-rays";
/** Size of the starburst texture; drawn at `RAYS_SCALE`, so its edges stay smooth. */
const RAYS_SIZE = 256;
/** How big the starburst shows: 256 * 0.28 is about 70 pixels across. */
const RAYS_SCALE = 0.28;
const RAY_COUNT = 12;
/** How wide each ray is, in radians either side of its middle. */
const RAY_WIDTH = 0.06;
/** How far the starburst turns over the whole effect, in degrees. */
const RAY_TURN = 70;

/**
 * Draws the starburst once: soft-sided rays that fade out toward their tips, around a glowing
 * core, all from real gradients so nothing bands.
 */
function ensureRaysTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(RAYS_TEXTURE)) return;
  const texture = scene.textures.createCanvas(RAYS_TEXTURE, RAYS_SIZE, RAYS_SIZE);
  if (!texture) return;
  const ctx = texture.getContext();
  const half = RAYS_SIZE / 2;

  /* The rays, blurred so their sides are soft, every other one shorter */
  ctx.save();
  ctx.filter = "blur(2px)";
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < RAY_COUNT; i++) {
    const angle = (i / RAY_COUNT) * Math.PI * 2;
    const reach = (i % 2 ? 0.65 : 1) * (half - 8);
    ctx.beginPath();
    ctx.moveTo(half, half);
    ctx.lineTo(
      half + Math.cos(angle - RAY_WIDTH) * reach,
      half + Math.sin(angle - RAY_WIDTH) * reach,
    );
    ctx.lineTo(
      half + Math.cos(angle + RAY_WIDTH) * reach,
      half + Math.sin(angle + RAY_WIDTH) * reach,
    );
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  /* Fade them out toward their tips */
  const fadeOut = ctx.createRadialGradient(half, half, 0, half, half, half);
  fadeOut.addColorStop(0, "rgba(255,255,255,1)");
  fadeOut.addColorStop(0.35, "rgba(255,255,255,0.7)");
  fadeOut.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = fadeOut;
  ctx.fillRect(0, 0, RAYS_SIZE, RAYS_SIZE);

  /* A warm glow at the middle */
  const glow = ctx.createRadialGradient(half, half, 0, half, half, half * 0.45);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.4, "rgba(255,244,190,0.6)");
  glow.addColorStop(1, "rgba(255,244,190,0)");
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, RAYS_SIZE, RAYS_SIZE);
  texture.refresh();
  /* Smooth when scaled, though the game is pixel art */
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

/**
 * A caught character: light rays burst from its body while it flashes white and shrinks into the
 * ball in front of it. Plays instead of the death dissolve. Visual only.
 */
export function playCaptureBeam(player: Player, at?: Point) {
  const { scene } = player;
  if (!scene || !player.active) return;
  /* On the ball, or the middle of its hit box (where a ball lands) when there is none */
  const box = characterHitBox(player);
  const center = at ?? { x: box.x, y: box.y };

  const body = snapshotBody(player);
  /* Shrink into the ball, not toward the feet */
  body.setOrigin(
    0.5 + (center.x - player.x) / body.width,
    0.5 + (center.y - player.y) / body.height,
  );
  body.setPosition(center.x, center.y);
  body.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);

  ensureRaysTexture(scene);
  const rays = scene.add.image(center.x, center.y, RAYS_TEXTURE);
  rays.setDepth(body.depth - 1).setBlendMode(Phaser.BlendModes.ADD);
  rays.setScale(0).setAlpha(0.95);
  const total = FLASH_MS;
  /* It spins the whole time, swells out fast, and fades as the body goes in */
  scene.tweens.add({ targets: rays, angle: RAY_TURN, duration: total });
  scene.tweens.add({
    targets: rays,
    scale: RAYS_SCALE,
    duration: FLASH_PEAK_MS,
    ease: "Cubic.easeOut",
  });
  scene.tweens.add({
    targets: rays,
    alpha: 0,
    delay: total * FLASH_FADE_SHARE,
    duration: total * (1 - FLASH_FADE_SHARE),
    onComplete: () => rays.destroy(),
  });
  scene.tweens.add({
    targets: body,
    scale: 0,
    delay: GLOW_MS,
    duration: PULL_MS,
    ease: "Cubic.easeIn",
    onComplete: () => body.destroy(),
  });
}
