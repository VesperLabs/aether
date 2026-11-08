import Phaser from "phaser";
import { getCastReadiness } from "@/rules/spells";
import { DODGE_SP_COST, getDodgeReadiness } from "@/rules/movement";
import type { Player } from "@/client/views/player";
import { isAimShown } from "./tap-aim";

/** Crosshair opacity right after a shot or cast; it climbs back as it readies, then snaps to full. */
const RELOADING_ALPHA = 0.2;
const READYING_ALPHA = 0.5;

/* The frame is a dotted trail leading to a reticle at its right edge (x 23-31 of 32, centered on 27) */
const RETICLE_LEFT = 23;
const RETICLE_CENTER_X = 27.5 / 32;
/** How far the reticle's center sits past the frame's, along the aim. */
const RETICLE_OFFSET = 27.5 - 16;

export class Crosshair extends Phaser.GameObjects.Container {
  declare center: Phaser.Math.Vector2;
  declare distance: number;
  declare player: Player;
  declare sprite: Phaser.GameObjects.Sprite;
  declare reticle: Phaser.GameObjects.Sprite;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    frame: string,
    player: Player,
    distance: number,
  ) {
    super(scene, x, y);

    this.scene = scene;
    this.distance = distance;
    this.center = new Phaser.Math.Vector2(x, y);

    this.player = player;

    /* Two pieces of one frame: the trail turns with the aim, the reticle at its end stays upright */
    this.sprite = new Phaser.GameObjects.Sprite(scene, 0, 0, textureKey, frame).setCrop(
      0,
      0,
      RETICLE_LEFT,
      32,
    );
    this.reticle = new Phaser.GameObjects.Sprite(scene, 0, 0, textureKey, frame)
      .setOrigin(RETICLE_CENTER_X, 0.5)
      .setCrop(RETICLE_LEFT, 0, 32 - RETICLE_LEFT, 32);
    this.add([this.sprite, this.reticle]);

    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }

  update() {
    if (!this?.player?.state) return;
    const state = this.player.state;
    this.setVisible(isAimShown(state, Date.now()));
    const angle = state.lastAngle ?? 0;
    const alpha = this.getReadiness();

    /* The trail turns with the aim from the body's center, where shots leave; the reticle stays upright */
    this.sprite.setRotation(angle).setAlpha(alpha);
    this.reticle
      .setPosition(Math.cos(angle) * RETICLE_OFFSET, Math.sin(angle) * RETICLE_OFFSET)
      .setAlpha(alpha);
    this.x = this.center.x + Math.cos(angle) * this.distance;
    this.y = this.center.y + Math.sin(angle) * this.distance;
  }

  /** Full opacity when the aimed spell or next attack is ready, faded while it is on cooldown. */
  private getReadiness() {
    const readiness = this.getProgress();
    if (readiness >= 1) return 1;
    return RELOADING_ALPHA + (READYING_ALPHA - RELOADING_ALPHA) * readiness;
  }

  /** 0 right after the shot or cast, 1 once ready again. */
  private getProgress() {
    const { player } = this;
    const { aimingSpellName, lastCast } = player.state;
    if (player.state.isAimingDodge) {
      /* Faded while the roll is on cooldown or there isn't the sp to pay for it */
      if ((player.stats?.sp ?? 0) < DODGE_SP_COST) return 0;
      return getDodgeReadiness(player.state, Date.now());
    }
    if (aimingSpellName) {
      return getCastReadiness({
        spellName: aimingSpellName,
        lastCast,
        castDelay: player.stats?.castDelay,
        now: Date.now(),
      });
    }
    const delay = player.getFullAttackDelay();
    if (!delay) return 1;
    return Math.min(1, (Date.now() - (player.state.lastAttack ?? 0)) / delay);
  }

  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy();
  }
}
