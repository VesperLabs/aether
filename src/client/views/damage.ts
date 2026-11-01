import Phaser from "phaser";
import { resourceTint } from "@/ui/kit/resource-colors";
import type { Player } from "./player";
import type { HitEffect } from "./player-hit";
const { Container, BitmapText } = Phaser.GameObjects;

export class Damage extends Container {
  declare dt: Phaser.GameObjects.BitmapText;
  declare duration: number;
  declare victim: Player;
  constructor(scene: Phaser.Scene, victim: Player, hit: HitEffect) {
    super(scene, victim.x, victim.y);
    let text: number | string = Math.abs(hit.amount as number);
    let damageSize = 20;
    let endY = -30;
    this.victim = victim;
    this.duration = 1000;

    const isPositive = (hit?.amount as number) >= 0;
    this.dt = new BitmapText(scene, 0, 0, "nin-light", String(hit.amount), damageSize);

    switch (hit.type) {
      case "buff":
        /* Buff hits carry no amount; the buff shows itself (see `Buff`) */
        this.setVisible(false);
        break;
      case "hp":
        if (isPositive) {
          text = "+" + text;
          this.dt.setTint(0x99ff99);
        } else {
          if (this.victim.isHero) {
            this.dt.setTint(0xffffff);
          } else {
            this.dt.setTint(0xff6666);
          }
        }
        break;
      case "miss":
        text = "miss!";
        if (this.victim.isHero) {
          this.dt.setTint(0x9999ff);
        } else {
          this.dt.setTint(0xffffff);
        }
        break;
      case "block":
        text = "block!";
        if (this.victim.isHero) {
          this.dt.setTint(0xff99ff);
        } else {
          this.dt.setTint(0xffffff);
        }
        break;
      case "exp":
        endY = -10;
        damageSize = 15;
        text = text + " XP";
        this.dt.setTint(0xd8b4fe); // purple.300
        break;
      case "mp":
      case "sp":
        /* Only drains show a number; regen and costs stay quiet */
        if (!hit.isDrain) {
          this.setVisible(false);
          break;
        }
        text = "+" + text;
        damageSize = 15;
        this.dt.setTint(resourceTint(hit.type));
        break;
      case "death":
        this.dt.setTint(0xff6666);
        break;
    }
    if (hit.isCritical) {
      damageSize = 40;
      text = text + "!";
      if (this.victim.isHero) {
        this.dt.setTint(0xffffff);
      } else {
        this.dt.setTint(0xff8833);
      }
    }
    this.dt.fontSize = damageSize;
    this.dt.setText(String(text));
    this.setDepth(99999);
    this.dt.setOrigin(0.5, 0.5);
    /* Scattered so numbers from fast hits do not stack on top of each other */
    this.dt.setPosition(this.width / 2 + this.randomRange(10), -10 + this.randomRange(4));

    // exp follows the hero, other damage goes above everything
    if (hit.type === "exp") {
      this.victim.add(this.dt);
    } else {
      this.add(this.dt);
    }

    /* Crits punch in big and settle */
    if (hit.isCritical) {
      this.dt.setScale(1.8);
      scene.tweens.add({ targets: this.dt, scale: 1, duration: 180, ease: "Back.easeOut" });
    }

    scene.tweens.add({
      targets: this.dt,
      props: {
        y: {
          value: () => this.dt.y + endY,
          ease: "Back.easeOut",
        },
        fontSize: {
          value: () => 10,
          ease: "Power1",
        },
        alpha: {
          value: () => 0,
          ease: "Linear",
        },
      },
      duration: this.duration,
      yoyo: false,
      repeat: 0,
      onComplete: () => {
        this.dt.destroy();
        this.destroy();
      },
    });

    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  randomRange(range: number) {
    return Math.floor(Math.random() * (range * 2 + 1)) - range;
  }

  update() {
    this.victim.bringToTop(this.dt);
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy();
  }
}
