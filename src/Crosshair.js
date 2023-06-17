class Crosshair extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, textureKey, frame, player, distance) {
    super(scene, x, y, textureKey, frame);

    this.scene = scene;
    this.distance = distance;
    this.center = new Phaser.Math.Vector2(x, y);

    this.player = player;

    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }

  update() {
    if (!this?.player?.state) return;
    this.setVisible(this?.player?.state?.isAiming);
    this.angle = this?.player?.state?.lastAngle;
    this.x = this.center.x + Math.cos(this.angle) * this.distance;
    this.y = this.center.y + Math.sin(this.angle) * this.distance;
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy();
  }
}

export default Crosshair;
