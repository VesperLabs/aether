import Phaser from "phaser";

/** How far ahead of the fist the puff sits, in pixels. */
const LEAD = 2;
/** The puff's radius as it grows, in pixels. */
const START_RADIUS = 1.5;
const END_RADIUS = 4;
/** How strong the puff starts. It's added to what's behind it, so it needn't be much. */
const START_ALPHA = 0.35;

export interface PunchBurstOptions {
  /** Where the fist is, relative to where this was added. Read every frame. */
  fist: () => { x: number; y: number };
  /** The direction of the punch, in degrees (0 is right, 90 is down). */
  facing: number;
  color: number;
  duration: number;
}

/** A bare-handed punch: one faint puff right at the fist, growing a little as it fades. */
export class PunchBurst extends Phaser.GameObjects.Graphics {
  declare options: PunchBurstOptions;
  declare progress: number;
  declare tween: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, options: PunchBurstOptions) {
    super(scene);
    this.options = options;
    this.progress = 0;
    this.setBlendMode(Phaser.BlendModes.ADD);
    this.tween = scene.tweens.add({
      targets: this,
      progress: 1,
      duration: options.duration,
      ease: "Sine.easeOut",
      onUpdate: () => this.draw(),
    });
    this.draw();
  }

  draw() {
    const { fist, facing, color } = this.options;
    const { x, y } = fist();
    const angle = Phaser.Math.DegToRad(facing);
    this.setPosition(x + Math.cos(angle) * LEAD, y + Math.sin(angle) * LEAD);
    this.clear();
    this.fillStyle(color, START_ALPHA * (1 - this.progress));
    this.fillCircle(0, 0, START_RADIUS + (END_RADIUS - START_RADIUS) * this.progress);
  }

  destroy(fromScene?: boolean) {
    this.tween?.stop();
    super.destroy(fromScene);
  }
}
