import Phaser from "phaser";
const { Container, BitmapText } = Phaser.GameObjects;

class Damage extends Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} user
   * @memberof Door
   */
  constructor(scene, victim, hit) {
    super(scene, victim.x, victim.y);
    let text = "";
    let damageSize = 30;
    this.victim = victim;
    this.duration = 1000;
    this.setDepth(99999);
    this.victim.hpBar.setVisible(true);
    if (this.victim.kind === "nasty") this.victim.userName.setVisible(true);
    const damageText = new BitmapText(scene, 0, 0, "nin-light", hit.amount, damageSize);
    switch (hit.type) {
      case "heal":
        text = "+" + Math.abs(hit.amount);
        damageText.setTint("0x99FF99");
        break;
      case "miss":
        text = "miss!";
        if (this.victim.isHero) {
          damageText.setTint("0x9999FF");
        } else {
          damageText.setTint("0xFFFFFF");
        }
        break;
      case "block":
        text = "Block!";
        if (this.victim.isHero) {
          damageText.setTint("0xFF99FF");
        } else {
          damageText.setTint("0xFFFFFF");
        }
        break;
      case "critical":
        damageSize = 120;
        text = hit.amount + "!";
        if (this.victim.isHero) {
          damageText.setTint("0xFFFFFF");
        } else {
          damageText.setTint("0xFF8833");
        }
        break;
      case "hit":
        text = hit.amount;
        if (this.victim.isHero) {
          damageText.setTint("0xFFFFFF");
        } else {
          damageText.setTint("0xFF6666");
        }
        break;
      case "heal":
        text = "+" + hit.amount;
        damageText.setTint("0x66FF66");
        break;
      case "level":
        text = "Level Up!";
        this.duration = 3000;
        damageText.setTint("0xFF0000", "0xFFFF00", "0x00FFFF", "0x0000FF");
        break;
      case "exp":
        text = hit.amount + " XP";
        damageText.setTint("0xEECCFF");
        break;
      case "death":
        if (hit.isCritical) {
          damageSize = 120;
          text = hit.amount + "!";
          if (this.victim.isHero) {
            damageText.setTint("0xFFFFFF");
          } else {
            damageText.setTint("0xFF8833");
          }
        } else {
          text = hit.amount;
          damageText.setTint("0xFF6666");
        }
        break;
    }
    damageText.fontSize = damageSize;
    damageText.setText(text);
    damageText.setX(-damageText.width / 2);
    damageText.setY(-damageText.height / 2);
    this.add(damageText);

    scene.tweens.add({
      targets: damageText,
      props: {
        x: {
          value: () => this.randomRange(60 - damageText.width / 2),
          ease: "Power1",
        },
        y: {
          value: () => -60,
          ease: "Power1",
        },
        fontSize: {
          value: () => 16,
          ease: "Power1",
        },
        alpha: {
          value: () => 0,
          ease: "Power1",
        },
      },
      duration: this.duration,
      yoyo: false,
      repeat: 0,
      onComplete: () => {
        this.victim.hpBar.setVisible(false);
        if (this.victim.kind === "nasty") this.victim.userName.setVisible(false);
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
    this.victim.bringToTop(this);
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy();
  }
}

export default Damage;
