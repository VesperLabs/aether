class Crosshair extends Phaser.GameObjects.Container {
  constructor(scene, x, y, textureKey, frame, player, distance) {
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
    this.setVisible(this?.player?.state?.isAiming);
    this.angle = this?.player?.state?.lastAngle;

    // Set the rotation of the sprite around its own axis
    this.sprite.setRotation(this.angle);

    // Calculate the position based on the rotated angle
    this.x = this.center.x + Math.cos(this.angle) * this.distance;
    this.y = this.center.y + Math.sin(this.angle) * this.distance;
  }

  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy();
  }
}

export default Crosshair;
