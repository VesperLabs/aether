import Phaser from "phaser";
import { playAudio } from "../utils";
const Sprite = Phaser.GameObjects.Sprite;
const BLANK_TEXTURE = "human-blank";
const ANIMATION_COMPLETE_EVENT = Phaser.Animations.Events.ANIMATION_COMPLETE;

class Hit extends Phaser.GameObjects.Container {
  hits: any;
  victim: Character;
  elements: Array<Elements>;
  constructor(scene, victim, elements: Array<Elements>) {
    super(scene, victim.x, victim.y);
    this.hits = [];
    this.victim = victim;
    this.elements = elements;

    for (let i = 0; i <= elements?.length - 1; i++) {
      this.hits[i] = scene.add.existing(new Sprite(scene, 0, 0, BLANK_TEXTURE, 0));
      this.hits[i].setOrigin(0.5);
      this.hits[i].setScale(0.5, 0.5);
      this.hits[i].play(`spell-anim-hits-${elements[i]}`);
      this.hits[i].y = this.victim.bodyCenterY;
      this.hits[i].on(ANIMATION_COMPLETE_EVENT, this.handleAnimationComplete, this);
      this.victim.add(this.hits[i]);
      // choose the correct sound
      if (elements[i] === "fire") {
        playAudio({ scene, audioKey: "spell-fireball", caster: victim });
      }
      if (elements[i] === "physical") {
        playAudio({ scene, audioKey: "melee-hit-1", caster: victim });
      }
      if (elements[i] === "earth") {
        playAudio({ scene, audioKey: "spell-earth", caster: victim });
      }
      if (elements[i] === "light") {
        playAudio({ scene, audioKey: "spell-light", caster: victim });
      }
      if (elements[i] === "water") {
        playAudio({ scene, audioKey: "spell-water", caster: victim });
      }
    }

    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  handleAnimationComplete(animation, frame, sprite) {
    for (let i = 0; i <= this.elements?.length - 1; i++) {
      this.hits[i].destroy();
    }
    this.destroy();
  }
  update() {
    for (let i = 0; i <= this.elements?.length - 1; i++) {
      this.victim.bringToTop(this.hits[i]);
    }
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy(true);
  }
}

export default Hit;
