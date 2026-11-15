import Phaser from "phaser";
import { isShallowAt, isWaterAt } from "@/client/scenes/ground-terrain";
import type { Player } from "./player";
import { bodyExtentOf } from "./body-extent";
import { feetOffsetOf } from "./feet";
import { fadeBelow, getShownBands } from "./wading-fade";
import { spawnDrops, spawnRipple, spawnWake } from "./splashes";

/** How far a wading body sinks, and how much of it is under the surface then, as shares of its height. */
const SINK_SHARE = 0.1;
const SUBMERGED_SHARE = 0.4;
/** For a body whose art can't be measured yet: its height, px at scale 1. */
const FALLBACK_HEIGHT = 28;
/** The body bobs this many px, once every `BOB_MS`, so it floats instead of standing on a floor. */
const BOB_HEIGHT = 1;
const BOB_MS = 1400;
/** The front half of the waterline ring: its smallest size at scale 1, and its two pixel shades. */
const RING_RADIUS_X = 9;
const RING_RADIUS_Y = 3;
const RING_LIGHT = 0xd8f0ff;
const RING_DARK = 0x6fb4e8;
/** Ms to wade in to the waist, or back out of the water. */
const WADE_MS = 260;
/** Steps in the shallows: how often a foot lands while walking. */
const STEP_EVERY_MS = 230;
/** How often a wading body leaves a beat of its V wake while it moves. */
const WAKE_EVERY_MS = 150;
/** Standing at the shore, a slow ripple under the feet this often. */
const IDLE_RIPPLE_MS = 1200;

/** The body layers that go under the water; weapons, name and bars stay above it. */
const bodyLayers = (player: Player) => [
  player.chest,
  player.skin,
  player.face,
  player.whiskers,
  player.hair,
  player.accessory,
  player.armor,
  player.boots,
  player.gloves,
  player.pants,
  player.helmet,
];

/** The faded copies under the waterline that are showing now, one set per body layer. */
export function getUnderwaterLayers(player: Player) {
  return bodyLayers(player).flatMap((layer) => (layer ? getShownBands(layer) : []));
}

/** Out of the water at once, as on death, when `updateWading` stops running: whole body, no ring. */
export function leaveWater(player: Player) {
  const view = views.get(player);
  if (!view) return;
  view.depth = 0;
  view.ring.clear();
  for (const layer of bodyLayers(player)) layer && fadeBelow(layer, undefined, 1);
}

interface WadingView {
  ring: Phaser.GameObjects.Graphics;
  nextSplashAt: number;
  /** Standing ripples run on their own clock, so walking off splashes at once. */
  nextIdleRippleAt: number;
  /** Which foot lands next, so shore steps alternate sides. */
  leftFoot: boolean;
  /** Wake beats since the last spray off the front. */
  wakeBeats: number;
  /** How far in it is, 0 (dry) to 1 (to the waist), eased so it walks in and out instead of popping. */
  depth: number;
  /** Where it was last frame, and the way it is heading through the water (smoothed, unit-ish). */
  lastX: number;
  lastY: number;
  dirX: number;
  dirY: number;
}

const views = new WeakMap<Player, WadingView>();

function viewOf(player: Player): WadingView {
  let view = views.get(player);
  if (!view) {
    view = {
      ring: player.scene.add.graphics(),
      nextSplashAt: 0,
      nextIdleRippleAt: 0,
      leftFoot: false,
      wakeBeats: 0,
      depth: 0,
      lastX: player.x,
      lastY: player.y,
      dirX: 0,
      dirY: 0,
    };
    player.rig.add(view.ring);
    views.set(player, view);
  }
  return view;
}

/**
 * The front half of a ring around the body at the waterline, in single pixels: lit at the front,
 * darker toward the sides. It swells a little as the body bobs, and more while walking.
 */
function drawRing(
  player: Player,
  ring: Phaser.GameObjects.Graphics,
  waterline: number,
  bob: number,
  depth: number,
  heading: { dirX: number; dirY: number },
  size: { ringX: number; ringY: number },
) {
  const scale = depth;
  const moving = player.currentSpeed > 0 ? 1 : 0;
  const rx = Math.round((size.ringX + moving + bob) * scale);
  const ry = Math.round((size.ringY + bob * 0.5) * scale);
  ring.clear();
  const steps = Math.max(rx * 3, 12);
  for (let i = 0; i <= steps; i++) {
    const angle = (Math.PI * i) / steps;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    /* Water piles up on the side it pushes into: there the ring bulges out a pixel and foams */
    const push = Math.max(0, cos * heading.dirX + sin * heading.dirY);
    const bulge = Math.round(push * 1.5 * scale);
    const x = Math.round(cos * (rx + bulge));
    const y = Math.round(waterline + sin * (ry + bulge / 2));
    /* Foam only while it pushes through; standing still, the ring is calm whichever way it faces */
    const lit = moving > 0 && push > 0.5;
    ring.fillStyle(lit ? RING_LIGHT : RING_DARK, (lit ? 0.9 : 0.7) * depth);
    ring.fillRect(x, y, 1, 1);
  }
  player.rig.bringToTop(ring);
}

/** Do the feet, where they are drawn, stand in the shallows: on the water side of a shore tile? */
const isAtShore = (player: Player, feetY: number) =>
  player.habitat !== "air" && isShallowAt(player.scene.map, player.x, feetY);

/** A foot landing in the shallows: a small ring where it lands and a few drops off the boot. */
function step(player: Player, leftFoot: boolean, feetY: number) {
  const scale = player.profile?.scale || 1;
  const x = player.x + (leftFoot ? -3 : 3) * scale;
  const heading = Math.sign(player.body?.velocity.x ?? 0);
  const { scene } = player;
  /* A ring where the foot lands, and a smaller one chasing it */
  spawnRipple(scene, x, feetY, player.depth - 1, { from: 2, to: 11 * scale, ms: 600, alpha: 0.9 });
  spawnRipple(scene, x, feetY, player.depth - 1, {
    from: 1,
    to: 6 * scale,
    ms: 500,
    alpha: 0.6,
    delay: 120,
  });
  spawnDrops(scene, x, feetY, player.depth + 1, { count: Phaser.Math.Between(3, 5), heading });
}

/** Standing at the water's edge: a slow ring now and then under the feet. */
function idleRipple(player: Player, feetY: number) {
  const scale = player.profile?.scale || 1;
  spawnRipple(player.scene, player.x, feetY, player.depth - 1, {
    from: 4 * scale,
    to: 12 * scale,
    ms: 1100,
    alpha: 0.55,
  });
}

/**
 * Shows a character in water while it stands on a water tile: the body sinks, bobs, is cut off at
 * the waist and has water in front of it, easing in and out as it wades. At the shore, its feet splash as it
 * walks. How deep it goes is measured from its feet, as a share of its height, so short bodies
 * (crabs) only get wet and tall ones sink in proportion.
 */
export function updateWading(player: Player) {
  const scale = player.profile?.scale || 1;
  const isAlive = !player.state.isDead;
  const isWading =
    isAlive && player.habitat !== "air" && isWaterAt(player.scene.map, player.x, player.y);
  const now = player.scene.time.now;
  if (!isAlive && !views.has(player)) return;
  const view = viewOf(player);
  const wadeStep = player.scene.game.loop.delta / WADE_MS;
  view.depth = Phaser.Math.Clamp(view.depth + (isWading ? wadeStep : -wadeStep), 0, 1);
  const depth = Phaser.Math.Easing.Sine.InOut(view.depth);

  const bob = (Math.sin((now / BOB_MS) * Math.PI * 2) + 1) * 0.5 * BOB_HEIGHT * depth;
  /* Feet and height from the art, in the rig's coordinates as drawn when dry */
  const skin = player.skin;
  const extent = bodyExtentOf(skin, player.direction);
  const feet = feetOffsetOf(player);
  const height = extent ? (extent.bottom + 1 - extent.top) * skin.scaleY : FALLBACK_HEIGHT * scale;
  const sinkDepth = height * SINK_SHARE;
  const sink = Math.round(sinkDepth * depth + bob * scale);
  /* The surface rises from the feet to `SUBMERGED_SHARE` of the sunk body */
  const surface = feet + sinkDepth - height * SUBMERGED_SHARE;
  const waterline = Math.round(Phaser.Math.Linear(feet, surface, depth));
  for (const sprite of bodyLayers(player)) {
    sprite.y = player.bodyOffsetY + sink;
    fadeBelow(sprite, depth > 0 ? waterline : undefined, scale);
  }
  /* Weapons ride with the body; the animation puts them back in place every frame */
  player.handLeft.y += sink;
  player.handRight.y += sink;
  player.shadow.setVisible(depth < 0.5);
  /* Heading from how it actually moved, so other players and mobs (moved by snapshots) get it too */
  const dx = player.x - view.lastX;
  const dy = player.y - view.lastY;
  const moved = Math.hypot(dx, dy);
  view.lastX = player.x;
  view.lastY = player.y;
  const ease = moved > 0.05 && moved < 20 ? 0.25 : 0;
  view.dirX += ((moved ? dx / moved : 0) - view.dirX) * (moved ? ease : 0.15);
  view.dirY += ((moved ? dy / moved : 0) - view.dirY) * (moved ? ease : 0.15);
  /* The ring spans the widest part of the art, centred on it */
  const skinLeft = -skin.displayOriginX * skin.scaleX;
  const ringX = Math.max(
    RING_RADIUS_X * scale,
    extent ? ((extent.right + 1 - extent.left) * skin.scaleX) / 2 + 2 : 0,
  );
  const ringY = (ringX * RING_RADIUS_Y) / RING_RADIUS_X;
  const artMiddle = extent ? (extent.left + extent.right + 1) / 2 : skin.frame.width / 2;
  /* A flipped sprite (facing left) draws its art mirrored */
  const middle = skin.flipX ? skin.frame.width - artMiddle : artMiddle;
  view.ring.x = Math.round(skinLeft + middle * skin.scaleX);
  if (depth > 0) drawRing(player, view.ring, waterline, bob, depth, view, { ringX, ringY });
  else view.ring.clear();

  if (!isAlive) return;
  const feetY = player.y + player.rig.y + feet;
  if (player.currentSpeed === 0) {
    if (!isWading && now >= view.nextIdleRippleAt && isAtShore(player, feetY)) {
      idleRipple(player, feetY);
      view.nextIdleRippleAt = now + IDLE_RIPPLE_MS;
    }
    return;
  }
  if (now < view.nextSplashAt) return;
  if (isWading) {
    /* A V wake trailing from the back of the waist ring, under the body */
    const speed = Math.hypot(view.dirX, view.dirY) || 1;
    const dirX = view.dirX / speed;
    const dirY = view.dirY / speed;
    const backX = player.x + view.ring.x - dirX * ringX * 0.6;
    const backY = player.y + waterline - dirY * ringY * 0.6;
    spawnWake(player.scene, backX, backY, player.depth - 1, {
      dirX,
      dirY,
      width: ringX * 2,
      drift: ringX,
      flatness: RING_RADIUS_X / RING_RADIUS_Y,
    });
    /* Every few beats, spray off the front where it pushes into the water */
    view.wakeBeats = (view.wakeBeats + 1) % 3;
    if (view.wakeBeats === 0) {
      const frontX = player.x + view.ring.x + dirX * ringX;
      const frontY = player.y + waterline + dirY * ringY;
      spawnDrops(player.scene, frontX, frontY, player.depth + 1, {
        count: Phaser.Math.Between(3, 5),
        heading: Math.sign(Math.round(dirX * 2)),
        headingY: Math.sign(Math.round(dirY * 2)),
      });
    }
    view.nextSplashAt = now + WAKE_EVERY_MS;
  } else {
    if (isAtShore(player, feetY)) step(player, view.leftFoot, feetY);
    view.leftFoot = !view.leftFoot;
    view.nextSplashAt = now + STEP_EVERY_MS;
  }
}
