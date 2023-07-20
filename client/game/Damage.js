import Phaser from "phaser";
const { Container, BitmapText } = Phaser.GameObjects;

class Damage extends Container {
  constructor(scene, victim, hit) {
    super(scene, victim.x, victim.y);
    let text = Math.abs(hit.amount);
    let damageSize = 20;
    let endY = -30;
    this.victim = victim;
    this.duration = 1000;

    const isPositive = hit?.amount >= 0;
    this.dt = new BitmapText(scene, 0, 0, "nin-light", hit.amount, damageSize);

    switch (hit.type) {
      case "hp":
        if (isPositive) {
          text = "+" + text;
          this.dt.setTint("0x99FF99");
        } else {
          text = text;
          if (this.victim.isHero) {
            this.dt.setTint("0xFFFFFF");
          } else {
            this.dt.setTint("0xFF6666");
          }
        }
        break;
      case "miss":
        text = "miss!";
        if (this.victim.isHero) {
          this.dt.setTint("0x9999FF");
        } else {
          this.dt.setTint("0xFFFFFF");
        }
        break;
      case "block":
        text = "block!";
        if (this.victim.isHero) {
          this.dt.setTint("0xFF99FF");
        } else {
          this.dt.setTint("0xFFFFFF");
        }
        break;
      case "exp":
        endY = -10;
        damageSize = 15;
        text = text + " XP";
        this.dt.setTint("0xFFFF66");
        break;
      case "mp":
        this.setVisible(false);
        break;
      case "sp":
        this.setVisible(false);
        break;
      case "death":
        text = text;
        this.dt.setTint("0xFF6666");

        break;
    }
    if (hit.isCritical) {
      damageSize = 40;
      text = text + "!";
      if (this.victim.isHero) {
        this.dt.setTint("0xFFFFFF");
      } else {
        this.dt.setTint("0xFF8833");
      }
    }
    this.dt.fontSize = damageSize;
    this.dt.setText(text);
    this.setDepth(99999);
    this.dt.setOrigin(0.5, 0.5);
    this.dt.setPosition(this.width / 2, -10);

    // exp follows the hero, other damage goes above everything
    if (hit.type === "exp") {
      this.victim.add(this.dt);
    } else {
      this.add(this.dt);
    }

    scene.tweens.add({
      targets: this.dt,
      props: {
        y: {
          value: () => endY,
          ease: "Power1",
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
  randomRange(range) {
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

export default Damage;
