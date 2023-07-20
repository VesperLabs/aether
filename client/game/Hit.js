import Phaser from "phaser";
const Sprite = Phaser.GameObjects.Sprite;
const BLANK_TEXTURE = "human-blank";
const ANIMATION_COMPLETE_EVENT = Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE;

class Hit extends Phaser.GameObjects.Container {
  constructor(scene, victim, elementalType) {
    super(scene, victim.x, victim.y);

    this.victim = victim;
    this.hit = scene.add.existing(new Sprite(scene, 0, 0, BLANK_TEXTURE, 0));
    this.hit.setOrigin(0.5);
    this.hit.setScale(0.25, 0.25);
    this.hit.play("spell-anim-hits-1");
    this.victim.add(this.hit);
    this.hit.y = this.victim.bodyCenterY;
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
    // Listen for the animation completion event
    this.hit.on(ANIMATION_COMPLETE_EVENT, this.handleAnimationComplete, this);
  }
  // Called when the animation is complete
  handleAnimationComplete(animation, frame, sprite) {
    // Destroy the Hit instance
    this.destroy();
  }
  update() {
    this.victim.bringToTop(this.hit);
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy();
  }
}

export default Hit;
