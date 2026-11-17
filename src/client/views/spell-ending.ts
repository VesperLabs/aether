import Phaser from "phaser";
import { playObjectDissolve } from "./dissolve";

/** How long a spent spell takes to flare and fade where it ended, ms. */
const FLARE_MS = 160;
/** Over its last this-long of flight, ms, an arrow comes down onto its shadow, landing as the shot ends. */
const FALL_MS = 260;
/** Its shadow darkens by this much as the arrow closes on it. */
const SHADOW_DARKEN = 1.6;
/** A landed arrow lies this long before fading over `FADE_MS`. */
const REST_MS = 350;
const FADE_MS = 250;
/**
 * A spell with no shadow fizzles out where it ended: it swells to `FLARE_SCALE` as it fades, and
 * `MOTES` faint motes of its colour rise gently from it, so it reads as running out, not hitting.
 */
const FLARE_SCALE = 1.2;
const MOTES = 4;
/** How far motes rise, px, how far they start from its middle, px, and how long they last, ms. */
const MOTE_RISE = 7;
const MOTE_SPREAD = 4;
const MOTE_MS = 450;
const MOTE_ALPHA = 0.7;

/** How far a spent ball rolls on along its throw, px, slowing to a stop over `ROLL_MS`. */
const ROLL_DISTANCE = 8;
/** How much farther or shorter than `ROLL_DISTANCE` one may roll, as a share of it. */
const ROLL_SPREAD = 0.5;
/** How far off its throw one may veer as it rolls, either way, in radians. */
const ROLL_VEER = 0.5;
const ROLL_MS = 300;
/** How long it lies still before it goes, ms, and how long it takes to pixelate away. */
const LIE_MS = 450;
const PIXELATE_MS = 300;

/** What a spent flying shot needs to end gently. */
interface SpentShot {
  /** Seeds how it rolls, so everyone watching sees the same. */
  id?: string | null;
  scene: Phaser.Scene;
  depth: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  spell: Phaser.GameObjects.Sprite;
  shadow?: Phaser.GameObjects.Sprite;
}

/** Faint motes of the spell's colour, rising gently from where it was and fading. */
function releaseMotes(shot: SpentShot) {
  const { scene, spell } = shot;
  const color = spell.tintTopLeft;
  for (let i = 0; i < MOTES; i++) {
    /* Spread across it, fixed rather than random, so the same spell fizzles the same way */
    const across = ((i / (MOTES - 1)) * 2 - 1) * MOTE_SPREAD;
    const x = Math.round(shot.x + spell.x + across);
    const y = Math.round(shot.y + spell.y + (i % 2 ? -1 : 1));
    const mote = scene.add
      .rectangle(x, y, 1, 1, color)
      .setAlpha(MOTE_ALPHA)
      .setDepth(shot.depth + 1);
    scene.tweens.add({
      targets: mote,
      y: y - MOTE_RISE * (0.6 + (0.4 * ((i * 3) % MOTES)) / MOTES),
      alpha: 0,
      delay: i * 40,
      duration: MOTE_MS,
      ease: Phaser.Math.Easing.Sine.Out,
      onComplete: () => mote.destroy(),
    });
  }
}

/**
 * Ends a flying shot that ran out of range or time, instead of it vanishing. One with a shadow (an
 * arrow) has already landed where the shot ended: it lies there a moment and fades. Any other
 * fizzles out where it ended, swelling and fading as faint motes rise from it, going no further than the shot did.
 * Calls `done` when it's gone.
 */
export function endSpentShot(
  shot: SpentShot,
  done: () => void,
  { rolls = false }: { rolls?: boolean } = {},
) {
  const { scene, spell, shadow } = shot;
  if (rolls) return rollToRest(shot, done);
  if (!shadow) {
    scene.tweens.add({
      targets: spell,
      alpha: 0,
      scale: spell.scale * FLARE_SCALE,
      duration: FLARE_MS,
      ease: Phaser.Math.Easing.Quadratic.Out,
      onComplete: done,
    });
    releaseMotes(shot);
    return;
  }

  /* It has already come down onto its shadow (see `droopSpentArrow`): it lies there, then fades */
  shadow.setVisible(false);
  scene.tweens.add({
    targets: spell,
    alpha: 0,
    delay: REST_MS,
    duration: FADE_MS,
    onComplete: done,
  });
}

/**
 * Brings an arrow down onto its shadow over the end of its real flight, so it lands just as the
 * shot ends and never seems to fly further than it did: dropping faster and faster, staying
 * level, its shadow darkening as it closes. `msLeft` is how much flight it has left; `y` and `turn`
 * are where it would be drawn level.
 */
export function droopSpentArrow(
  shot: Pick<SpentShot, "velocityX" | "velocityY" | "spell" | "shadow">,
  {
    msLeft,
    y,
    turn,
    shadowY,
    shadowAlpha,
  }: { msLeft: number; y: number; turn: number; shadowY: number; shadowAlpha: number },
) {
  const { spell, shadow } = shot;
  if (!shadow) return;
  const fall = Phaser.Math.Easing.Quadratic.In(1 - Phaser.Math.Clamp(msLeft / FALL_MS, 0, 1));
  spell.y = y + (shadowY - y) * fall;
  spell.rotation = turn;
  shadow.setAlpha(shadowAlpha * (1 + (SHADOW_DARKEN - 1) * fall));
}

/**
 * A thrown ball that hit nothing: it rolls on a little along its throw, its tumble slowing with it,
 * lies there a moment, then pixelates away as a creature does when it dies. Calls `done` once it
 * is off the shot, which it outlives as a copy in the world.
 */
function rollToRest(shot: SpentShot, done: () => void) {
  const { scene, spell, shadow } = shot;
  /* Each ball rolls a little differently: as far and as far off its line as its id says */
  const seed = hashId(shot.id ?? "");
  const share = (bits: number) => ((seed >>> bits) % 1000) / 1000;
  const distance = ROLL_DISTANCE * (1 - ROLL_SPREAD + 2 * ROLL_SPREAD * share(0));
  const angle = Math.atan2(shot.velocityY, shot.velocityX) + (share(10) * 2 - 1) * ROLL_VEER;
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance;
  /* It has come down onto its shadow (see `droopSpentArrow`), which rolls along under it */
  scene.tweens.add({
    targets: shadow ? [spell, shadow] : spell,
    x: `+=${dx}`,
    y: `+=${dy}`,
    duration: ROLL_MS,
    ease: Phaser.Math.Easing.Quadratic.Out,
  });
  /* The tumble winds down with the roll, and stops on whatever face it reached */
  scene.tweens.add({
    targets: spell.anims,
    timeScale: 0,
    duration: ROLL_MS,
    ease: Phaser.Math.Easing.Quadratic.Out,
    onComplete: () => spell.anims.pause(),
  });
  scene.time.delayedCall(ROLL_MS + LIE_MS, () => {
    if (!spell.active) return done();
    shadow?.setVisible(false);
    /* A copy in the world pixelates away; the shot itself can go */
    const { tx, ty } = spell.getWorldTransformMatrix();
    const resting = scene.add
      .image(tx, ty, spell.texture.key, spell.frame.name)
      .setScale(spell.scaleX * (spell.parentContainer?.scaleX ?? 1))
      .setFlipX(spell.flipX)
      .setDepth(shot.depth);
    done();
    playObjectDissolve(resting, PIXELATE_MS);
  });
}

/** A steady number from an id (FNV-1a). */
function hashId(id: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
