import Phaser from "phaser";
import { getCastReadiness } from "@/rules/spells";
import { DODGE_SP_COST, getDodgeReadiness } from "@/rules/movement";
import type { Player } from "@/client/views/player";
import { isDodgeAimShown } from "./hero-dodge";

/** Crosshair opacity right after a shot or cast; it climbs back as it readies, then snaps to full. */
const RELOADING_ALPHA = 0.2;
const READYING_ALPHA = 0.5;

export class Crosshair extends Phaser.GameObjects.Container {
  declare center: Phaser.Math.Vector2;
  declare distance: number;
  declare player: Player;
  declare sprite: Phaser.GameObjects.Sprite;
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

    // Create the sprite and add it as a child of the container
    this.sprite = new Phaser.GameObjects.Sprite(scene, 0, 0, textureKey, frame);
    this.add(this.sprite);

    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }

  update() {
    if (!this?.player?.state) return;
    const state = this.player.state;
    this.setVisible(!!state.isAiming || isDodgeAimShown(state, Date.now()));
    this.angle = this?.player?.state?.lastAngle;

    // Set the rotation of the sprite around its own axis
    this.sprite.setRotation(this.angle);
    this.sprite.setAlpha(this.getReadiness());

    // Calculate the position based on the rotated angle
    this.x = this.center.x + Math.cos(this.angle) * this.distance;
    this.y = this.center.y + Math.sin(this.angle) * this.distance;
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
