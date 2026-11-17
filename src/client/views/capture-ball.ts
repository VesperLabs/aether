import Phaser from "phaser";
import { buffList } from "@/content";
import { characterHitBox } from "@/rules/spells";
import { FLASH_PEAK_MS, playCaptureBeam } from "./capture-beam";
import { playCaptureStruggle } from "./capture-struggle";
import { playObjectDissolve } from "./dissolve";
import { BALL_SHEET, shutBallFrame } from "./ball-sheet";
import type { Player } from "./player";

/** The debuff a creature struggles in, inside a thrown ball. */
const CAPTURING = "capturing";

/** Half its art's size, as it is drawn in flight. */
const BALL_SCALE = 0.5;
/** How long a ball that broke open takes to pixelate away, in ms. */
const PIXELATE_MS = 300;
/**
 * A debuff that ends waits this long for the catch, in ms, before the ball pops: the catch and the
 * buff change are separate messages.
 */
const CATCH_WAIT_MS = 200;
/** How far in front of its creature the ball sorts, past the white body a catch flashes. */
const DEPTH_AHEAD = 3;

/**
 * The ball a creature struggles in while it has `capturing`: it rides the middle of its hit box and
 * shakes, then the creature goes into it (`catchInto`) or it pops open. Visual only: the server
 * decides the catch when the debuff runs out.
 */
export class CaptureBall extends Phaser.GameObjects.Container {
  declare owner: Player;
  declare ball: Phaser.GameObjects.Image;
  private stopStruggle = () => {};
  private isShown = false;
  private popTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, owner: Player) {
    super(scene, 0, 0);
    this.owner = owner;
    this.ball = scene.add.image(0, 0, BALL_SHEET, shutBallFrame()).setScale(BALL_SCALE);
    this.add(this.ball);
    this.setVisible(false);
    scene.events.on("update", this.watch, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.events.off("update", this.watch, this);
      this.stopStruggle();
      this.popTimer?.remove();
    });
  }

  /** Shows the ball while the debuff is on, and lets it go when it ends. */
  watch() {
    const { owner } = this;
    const isCapturing = !!owner.active && !owner.state?.isDead && owner.hasBuff(CAPTURING);
    if (isCapturing && !this.isShown) this.show();
    else if (!isCapturing && this.isShown && !this.popTimer && !owner.state?.isDead) {
      this.popTimer = this.scene.time.delayedCall(CATCH_WAIT_MS, () => this.pop());
    }
    if (this.isShown) this.ball.setY(characterHitBox(owner).y - owner.y);
  }

  private show() {
    this.popTimer?.remove();
    this.popTimer = undefined;
    this.isShown = true;
    this.setVisible(true);
    /* The ball that was thrown: its tier is the debuff's level */
    const level = this.owner.buffs?.find((buff) => buff?.name === CAPTURING)?.level;
    this.ball.setFrame(shutBallFrame(level));
    this.stopStruggle();
    this.stopStruggle = playCaptureStruggle(this.ball, buffList[CAPTURING].duration);
  }

  /** Takes the ball off its creature, as an image in the world where it was. */
  private release() {
    this.popTimer?.remove();
    this.popTimer = undefined;
    this.isShown = false;
    this.stopStruggle();
    this.setVisible(false);
    const { tx, ty } = this.ball.getWorldTransformMatrix();
    return this.scene.add
      .image(tx, ty, BALL_SHEET, this.ball.frame.name)
      .setScale(BALL_SCALE)
      .setDepth(this.owner.depth + DEPTH_AHEAD);
  }

  /** It broke free: the ball pops open and pixelates away. */
  private pop() {
    playObjectDissolve(this.release(), PIXELATE_MS);
  }

  /**
   * It was caught: the creature goes into the ball in a burst of light, and the ball goes with the
   * flash. Returns false if no ball was on it, for an admin's follow that just beams.
   */
  catchInto() {
    if (!this.isShown && !this.popTimer) return false;
    const ball = this.release();
    playCaptureBeam(this.owner, { x: ball.x, y: ball.y });
    playObjectDissolve(ball, FLASH_PEAK_MS);
    return true;
  }
}
