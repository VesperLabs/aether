import Phaser from "phaser";
import type { Player } from "./player";
import { playAudio } from "@/client/audio/play-audio";
const Sprite = Phaser.GameObjects.Sprite;
const BLANK_TEXTURE = "human-blank";
const ANIMATION_COMPLETE_EVENT = Phaser.Animations.Events.ANIMATION_COMPLETE;

export class Hit extends Phaser.GameObjects.Container {
  hits: Phaser.GameObjects.Sprite[];
  victim: Player;
  elements: string[];
  constructor(
    scene: Phaser.Scene,
    victim: Player,
    elements: string[] | undefined,
    { scale = 0.5, alpha = 1, silent = false } = {},
  ) {
    super(scene, victim.x, victim.y);
    this.hits = [];
    this.victim = victim;
    this.elements = elements ?? [];

    for (let i = 0; i <= this.elements.length - 1; i++) {
      this.hits[i] = scene.add.existing(new Sprite(scene, 0, 0, BLANK_TEXTURE, 0));
      this.hits[i].setOrigin(0.5);
      this.hits[i].setScale(scale).setAlpha(alpha);
      this.hits[i].play(`spell-anim-hits-${this.elements[i]}`);
      /* Holy (heals included) glows pure white rather than the sheet's green */
      if (this.elements[i] === "holy") {
        this.hits[i]
          .setTint(0xffffff)
          .setTintMode(Phaser.TintModes.FILL)
          .setBlendMode(Phaser.BlendModes.ADD);
      }
      this.hits[i].y = this.victim.bodyCenterY;
      this.hits[i].on(ANIMATION_COMPLETE_EVENT, this.handleAnimationComplete, this);
      this.victim.add(this.hits[i]);
      if (silent) continue;
      // choose the correct sound
      if (this.elements[i] === "fire") {
        playAudio({ scene, audioKey: "spell-fireball", caster: victim });
      }
      if (this.elements[i] === "physical") {
        playAudio({ scene, audioKey: "melee-hit-1", caster: victim });
      }
      if (this.elements[i] === "earth") {
        playAudio({ scene, audioKey: "spell-earth", caster: victim });
      }
      if (this.elements[i] === "light") {
        playAudio({ scene, audioKey: "spell-light", caster: victim });
      }
      if (this.elements[i] === "water") {
        playAudio({ scene, audioKey: "spell-water", caster: victim });
      }
      if (this.elements[i] === "holy") {
        playAudio({ scene, audioKey: "spell-holy", caster: victim });
      }
    }

    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  handleAnimationComplete() {
    for (let i = 0; i <= this.elements.length - 1; i++) {
      this.hits[i].destroy();
    }
    this.destroy();
  }
  update() {
    for (let i = 0; i <= this.elements.length - 1; i++) {
      this.victim.bringToTop(this.hits[i]);
    }
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy();
  }
}
