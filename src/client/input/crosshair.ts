import Phaser from "phaser";
import type { Player } from "@/client/views/player";

/** Crosshair opacity right after a shot; it climbs back as the attack readies, then snaps to full. */
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
    this.setVisible(!!this?.player?.state?.isAiming);
    this.angle = this?.player?.state?.lastAngle;

    // Set the rotation of the sprite around its own axis
    this.sprite.setRotation(this.angle);
    this.sprite.setAlpha(this.getReadiness());

    // Calculate the position based on the rotated angle
    this.x = this.center.x + Math.cos(this.angle) * this.distance;
    this.y = this.center.y + Math.sin(this.angle) * this.distance;
  }

  /** Full opacity when the next attack is ready, faded while it is still on cooldown. */
  private getReadiness() {
    const { player } = this;
    const delay = player.getFullAttackDelay();
    const elapsed = Date.now() - (player.state.lastAttack ?? 0);
    if (!delay || elapsed >= delay) return 1;
    return RELOADING_ALPHA + (READYING_ALPHA - RELOADING_ALPHA) * (elapsed / delay);
  }

  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy();
  }
}
