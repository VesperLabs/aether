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
/**
 * A thrown ball that stopped on a creature waits there this long for `capturing` to come in, ms,
 * before it pops: it may have missed the catch, or the debuff may be on its way.
 */
const HOLD_MS = 800;
/** How long `capturing` that came in first waits, hidden, for its thrown ball to arrive, ms. */
const AWAIT_MS = 250;
/** How long a caught thrown ball takes to settle into the middle of its creature, ms. */
const SETTLE_MS = 120;
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
  private holdTimer?: Phaser.Time.TimerEvent;
  private awaitTimer?: Phaser.Time.TimerEvent;
  /** How far a thrown ball still is from the middle of its creature, settling to nothing. */
  private settle = { x: 0, y: 0 };
  /** Whether the ball on show is one that was thrown and caught here. */
  private hasThrown = false;

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
      this.holdTimer?.remove();
      this.awaitTimer?.remove();
      scene.tweens.killTweensOf(this.settle);
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
    /* Rides the middle of its creature, plus however far a thrown ball still has to settle */
    if (this.visible) {
      this.ball.setPosition(this.settle.x, characterHitBox(owner).y - owner.y + this.settle.y);
    }
  }

  /**
   * A thrown ball stopped on its creature: this ball takes its place, where it is and as it looks,
   * and settles into the creature's middle. Before or after `capturing` comes in, it is the same
   * ball; if the debuff never does, it pops.
   */
  catchThrown(thrown: Phaser.GameObjects.Sprite) {
    if (this.popTimer || !this.owner.active) return;
    const { tx, ty } = thrown.getWorldTransformMatrix();
    const at = this.getWorldTransformMatrix().applyInverse(tx, ty);
    const middle = characterHitBox(this.owner).y - this.owner.y;
    this.settle.x = at.x;
    this.settle.y = at.y - middle;
    this.hasThrown = true;
    this.awaitTimer?.remove();
    this.awaitTimer = undefined;
    this.ball.setFrame(thrown.frame.name).setVisible(true);
    this.setVisible(true);
    this.watch();
    this.scene.tweens.killTweensOf(this.settle);
    this.scene.tweens.add({
      targets: this.settle,
      x: 0,
      y: 0,
      duration: SETTLE_MS,
      ease: Phaser.Math.Easing.Quadratic.Out,
      /* Lands upright, shut, as the ball its creature struggles in */
      onComplete: () => this.ball.setFrame(shutBallFrame(this.level() ?? 1)),
    });
    this.holdTimer?.remove();
    this.holdTimer = this.isShown
      ? undefined
      : this.scene.time.delayedCall(HOLD_MS, () => {
          this.holdTimer = undefined;
          if (!this.isShown) this.pop();
        });
  }

  /** The tier of the ball thrown: the debuff's level. */
  private level() {
    return this.owner.buffs?.find((buff) => buff?.name === CAPTURING)?.level;
  }

  private show() {
    this.popTimer?.remove();
    this.popTimer = undefined;
    this.holdTimer?.remove();
    this.holdTimer = undefined;
    this.isShown = true;
    this.setVisible(true);
    this.stopStruggle();
    this.stopStruggle = playCaptureStruggle(this.ball, buffList[CAPTURING].duration);
    /* A thrown ball already caught is this ball, mid-settle: leave it be */
    if (this.hasThrown) return;
    this.settle.x = 0;
    this.settle.y = 0;
    this.ball.setFrame(shutBallFrame(this.level()));
    /*
     * The debuff can beat the thrown ball here by a frame or two: keep hidden for the ball to
     * arrive, rather than show a second one in the middle. Someone who walked in sees it soon after.
     */
    this.ball.setVisible(false);
    this.awaitTimer = this.scene.time.delayedCall(AWAIT_MS, () => {
      this.awaitTimer = undefined;
      this.ball.setVisible(true);
    });
  }

  /** Takes the ball off its creature, as an image in the world where it was. */
  private release() {
    this.popTimer?.remove();
    this.popTimer = undefined;
    this.holdTimer?.remove();
    this.holdTimer = undefined;
    this.awaitTimer?.remove();
    this.awaitTimer = undefined;
    this.scene.tweens.killTweensOf(this.settle);
    this.hasThrown = false;
    this.ball.setVisible(true);
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
    const ball = this.release();
    /* Pixelates away on its creature, wherever it goes, not left behind where it broke */
    const offset = { x: ball.x - this.owner.x, y: ball.y - this.owner.y };
    const follow = () => ({ x: this.owner.x + offset.x, y: this.owner.y + offset.y });
    playObjectDissolve(ball, PIXELATE_MS, follow);
  }

  /**
   * It was caught: the creature goes into the ball in a burst of light, and the ball goes with the
   * flash. Returns false if no ball was on it, for an admin's follow that just beams.
   */
  catchInto() {
    if (!this.visible) return false;
    const ball = this.release();
    playCaptureBeam(this.owner, { x: ball.x, y: ball.y });
    playObjectDissolve(ball, FLASH_PEAK_MS);
    return true;
  }
}
