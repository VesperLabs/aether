const STARTING_ALPHA = 1;
const TARGET_SCALE = 1;

class EnergyBall extends Phaser.GameObjects.Sprite {
  private targetScale: number;
  private targetAlpha: number;
  private targetX: number;
  private targetY: number;
  private distance: number;
  private initialX: number;
  private initialY: number;
  public isExpired: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, distance: number) {
    super(scene, x, y, "icons", "energy");
    this.initialX = x;
    this.initialY = y;
    this.distance = distance;
    this.reset();

    scene.add.existing(this);
  }

  update() {
    const distanceToTarget = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.targetX,
      this.targetY
    );

    if (distanceToTarget > 1) {
      const angleToTarget = Phaser.Math.Angle.Between(this.x, this.y, this.targetX, this.targetY);
      const velocity = new Phaser.Math.Vector2(
        Math.cos(angleToTarget),
        Math.sin(angleToTarget)
      ).scale(1);

      this.x += velocity.x;
      this.y += velocity.y;

      const scale = Phaser.Math.Linear(this.scaleX, this.targetScale, 0.08);
      this.setScale(scale, scale);

      const alpha = Phaser.Math.Linear(this.alpha, this.targetAlpha, 0.06);
      this.setAlpha(alpha);
    } else {
      this.reset(); // Reset the energy ball to its initial        state
    }
  }

  reset() {
    const angle = Phaser.Math.RND.angle();
    const center = new Phaser.Math.Vector2(this.initialX, this.initialY);
    this.targetScale = TARGET_SCALE;
    this.targetAlpha = 0;
    this.targetX = center.x;
    this.targetY = center.y;
    this.x = center.x + this.distance * Math.cos(angle);
    this.y = center.y + this.distance * Math.sin(angle);
    this.setScale(0, 0);
    this.setAlpha(STARTING_ALPHA);
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy();
  }
}

class Charge extends Phaser.GameObjects.Container {
  private distance: number;
  private chargePercent: number;
  constructor(scene, x, y, distance = 24) {
    super(scene, x, y);
    this.distance = distance;
    this.scene = scene;
    this.chargePercent = 0;

    scene.add.existing(this);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  updateChargePercent(chargePercent: number) {
    const energyBalls = this.list as EnergyBall[];
    if (chargePercent === 0 && energyBalls[0]) {
      energyBalls[0].destroy(); // Destroy the energy ball
      this.remove(energyBalls[0]); // Remove it from the container
    } else if (energyBalls.length < chargePercent / 4) {
      const energyBall = new EnergyBall(this.scene, this.x, this.y, this.distance);

      this.add(energyBall);
    }
  }
  update() {
    const energyBalls = this.list as EnergyBall[];

    for (let i = energyBalls.length - 1; i >= 0; i--) {
      const energyBall = energyBalls[i];

      if (energyBall.scaleX === 0 || energyBall.scaleX === TARGET_SCALE) {
        // Generate a random number from 1 to 100
        const randomNumber = Phaser.Math.Between(1, 50);

        // Only update the energy ball if the random number is equal to 100
        if (randomNumber === 1) {
          energyBall.update();
        }
      } else {
        energyBall.update();
      }
    }
  }

  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy();
  }
}

export default Charge;
