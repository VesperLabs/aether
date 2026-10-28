import Phaser from "phaser";

/** How wide a swing sweeps, in degrees, centred on the facing direction. */
const SWING_DEGREES = 150;
/** The trail behind the blade, as a fraction of the sweep. */
const TRAIL_FRACTION = 0.7;
/** How thick the crescent is at the blade, as a fraction of the reach. */
const THICKNESS = 0.35;
/** Points along each edge of the crescent. More is smoother. */
const STEPS = 24;

export type SwingHand = "handLeft" | "handRight";

/** The swing each character is in the middle of, so their weapon can follow the blade. */
const activeSwings = new WeakMap<
  object,
  { arc: SwingArc; hand: SwingHand; artDegrees: number; endAngle?: number; endedAt?: number }
>();
/** Once the attack pose ends, how long the weapon takes to turn back to its idle pose, in ms. */
const RETURN_MS = 50;

/**
 * The rotation (degrees) a swinging weapon is drawn at, keeping its pose's flips so it never
 * flips mid-swing. It follows the blade, holds where the swing ended for the rest of the attack
 * (`isAttacking`), then turns back to the idle pose's rotation. Undefined when `hand` is not
 * swinging. The weapon stays in the hand: its art's handle is the sprite's centre.
 */
export function getSwingWeaponAngle(
  character: object,
  hand: SwingHand,
  pose: WeaponPose,
  isAttacking: boolean,
) {
  const swing = activeSwings.get(character);
  if (!swing || swing.hand !== hand) return undefined;
  const artAngle = getArtAngle(swing.artDegrees, pose);
  if (swing.arc.active) return swing.arc.getBladeAngle() - artAngle;
  if (swing.endAngle === undefined) return undefined;
  if (isAttacking) return swing.endAngle - artAngle;
  swing.endedAt ??= Date.now();
  const t = (Date.now() - swing.endedAt) / RETURN_MS;
  if (t >= 1) {
    activeSwings.delete(character);
    return undefined;
  }
  const swung = swing.endAngle - artAngle;
  const turn = Phaser.Math.Angle.ShortestBetween(swung, pose.rotation ?? 0);
  return swung + turn * Phaser.Math.Easing.Sine.Out(t);
}

export interface WeaponPose {
  flipX?: boolean;
  flipY?: boolean;
  rotation?: number;
}

/** Which way the art's blade points once the pose's flips are applied, before rotating. */
function getArtAngle(artDegrees: number, { flipX, flipY }: WeaponPose) {
  const blade = rad(artDegrees);
  const x = Math.cos(blade) * (flipX ? -1 : 1);
  const y = Math.sin(blade) * (flipY ? -1 : 1);
  return Phaser.Math.RadToDeg(Math.atan2(y, x));
}

export interface SwingArcOptions {
  /** How far the blade reaches from the pivot, in pixels. The arc's outer edge. */
  reach: number;
  /** Where the arc turns around, relative to where it was added. Read every frame. */
  pivot?: () => { x: number; y: number };
  /** The direction the swing is centred on, in degrees (0 is right, 90 is down). */
  facing: number;
  /** Which way the blade sweeps (on screen, y down). */
  clockwise: boolean;
  /** Whose weapon follows the blade, in which hand, and which way its art points (degrees). */
  wielder?: { character: object; hand: SwingHand; artDegrees: number };
  color: number;
  duration: number;
}

/**
 * A weapon swing drawn as one crescent around the weapon's hand, as long as its blade: thickest
 * at the blade, tapering to a point along the trail, glowing additively, with a thin bright edge
 * near the blade. Drawn as a single shape every frame, so it stays sharp and has no seams.
 */
export class SwingArc extends Phaser.GameObjects.Graphics {
  declare options: SwingArcOptions;
  declare progress: number;
  declare tween: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, options: SwingArcOptions) {
    super(scene);
    this.options = options;
    this.progress = 0;
    this.setBlendMode(Phaser.BlendModes.ADD);
    if (options.wielder) {
      const { character, hand, artDegrees } = options.wielder;
      activeSwings.set(character, { arc: this, hand, artDegrees });
    }
    this.tween = scene.tweens.add({
      targets: this,
      progress: 1,
      duration: options.duration,
      ease: "Sine.easeOut",
      onUpdate: () => this.draw(),
    });
    this.draw();
  }

  /** The blade's current angle on screen, in degrees. Holds at the end once the sweep is done. */
  getBladeAngle() {
    const { start, direction, blade } = this.getSweep();
    return start + blade * direction;
  }

  getSweep() {
    const { facing, clockwise } = this.options;
    const direction = clockwise ? 1 : -1;
    const start = facing - (SWING_DEGREES / 2) * direction;
    /* The blade sweeps the arc, then the trail drains into it */
    const travel = SWING_DEGREES * (1 + TRAIL_FRACTION);
    const blade = Math.min(this.progress * travel, SWING_DEGREES);
    return { direction, start, travel, blade };
  }

  draw() {
    const { reach, color, pivot } = this.options;
    if (pivot) this.setPosition(pivot().x, pivot().y);
    const { direction, start, travel, blade } = this.getSweep();
    const tail = Math.max(0, this.progress * travel - SWING_DEGREES * TRAIL_FRACTION);
    this.clear();
    if (blade - tail <= 0) return;
    /* The blade fades once it has finished its sweep */
    const alpha = Math.min(1, (travel * (1 - this.progress)) / (SWING_DEGREES * TRAIL_FRACTION));
    const angleAt = (along: number) => rad(start + along * direction);

    /* Outer edge from the tail to the blade, then the inner edge back, thinning to the tail */
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= STEPS; i++) {
      const along = tail + ((blade - tail) * i) / STEPS;
      points.push(polar(reach, angleAt(along)));
    }
    for (let i = STEPS; i >= 0; i--) {
      const t = i / STEPS;
      const along = tail + (blade - tail) * t;
      /* Eased so the crescent stays full near the blade and narrows quickly toward the tail */
      const thickness = reach * THICKNESS * Math.sqrt(t);
      points.push(polar(reach - thickness, angleAt(along)));
    }
    this.fillStyle(color, 0.75 * alpha);
    this.fillPoints(points, true);

    /* A thin bright edge over the third nearest the blade */
    const edgeFrom = blade - (blade - tail) / 3;
    this.lineStyle(1.5, 0xffffff, 0.9 * alpha);
    this.beginPath();
    this.arc(
      0,
      0,
      reach,
      angleAt(direction > 0 ? edgeFrom : blade),
      angleAt(direction > 0 ? blade : edgeFrom),
    );
    this.strokePath();
  }

  destroy(fromScene?: boolean) {
    this.tween?.stop();
    const wielder = this.options.wielder?.character;
    /* Keeps the end of the swing so the weapon can hold there, then turn back from it */
    const swing = wielder && activeSwings.get(wielder);
    if (swing && swing.arc === this) swing.endAngle = this.getBladeAngle();
    super.destroy(fromScene);
  }
}

const rad = Phaser.Math.DegToRad;

function polar(radius: number, angle: number) {
  return new Phaser.Math.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
}
