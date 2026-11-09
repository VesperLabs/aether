import Phaser from "phaser";
import type { Player } from "./player";

const STAR_TEXTURE = "stun-star";
const STAR_COUNT = 3;
/** The ellipse the stars circle, in world pixels, scaled with the body. */
const ORBIT_RADIUS_X = 8;
const ORBIT_RADIUS_Y = 2.5;
/** How far below the hp bar the ring sits: around the top of the head. */
const HEAD_OFFSET_Y = 5;
/** One lap, in ms. */
const LAP_MS = 900;
/** Stars passing behind the head are dimmed, so the ring reads as going around it. */
const BACK_ALPHA = 0.45;

/** A 5x5 pixel star: a plus with a bright centre and a dark edge, drawn once per game. */
function ensureStarTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(STAR_TEXTURE)) return;
  const g = scene.make.graphics({}, false);
  g.fillStyle(0x6b4a00).fillRect(2, 0, 1, 5).fillRect(0, 2, 5, 1);
  g.fillStyle(0xffd84a).fillRect(2, 1, 1, 3).fillRect(1, 2, 3, 1);
  g.fillStyle(0xffffff).fillRect(2, 2, 1, 1);
  g.generateTexture(STAR_TEXTURE, 5, 5);
  g.destroy();
}

/** Little stars circling a character's head while it is stunned. Visual only. */
export class StunStars extends Phaser.GameObjects.Container {
  declare owner: Player;
  declare stars: Phaser.GameObjects.Image[];
  constructor(scene: Phaser.Scene, owner: Player) {
    super(scene, 0, owner.headY + HEAD_OFFSET_Y * owner.proScale);
    ensureStarTexture(scene);
    this.owner = owner;
    this.stars = Array.from({ length: STAR_COUNT }, () => scene.add.image(0, 0, STAR_TEXTURE));
    this.add(this.stars);
    this.setVisible(false);
    scene.events.on("update", this.spin, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off("update", this.spin, this));
  }
  /** Shows the ring while stunned and moves each star along it. */
  spin(time: number) {
    const { owner } = this;
    const isStunned = !!owner.active && !owner.state?.isDead && owner.hasBuff("stun");
    this.setVisible(isStunned);
    if (!isStunned) return;
    const scale = owner.proScale || 1;
    const lap = ((time % LAP_MS) / LAP_MS) * Math.PI * 2;
    this.stars.forEach((star, index) => {
      const angle = lap + (index / STAR_COUNT) * Math.PI * 2;
      /* Whole pixels, so the stars stay crisp */
      star.setPosition(
        Math.round(Math.cos(angle) * ORBIT_RADIUS_X * scale),
        Math.round(Math.sin(angle) * ORBIT_RADIUS_Y * scale),
      );
      star.setAlpha(Math.sin(angle) < 0 ? BACK_ALPHA : 1);
    });
  }
}
