import Phaser from "phaser";

const Sprite = Phaser.GameObjects.Sprite;

class BuffRack extends Phaser.GameObjects.Container {
  constructor(scene, x, y, buffs = []) {
    super(scene, x, y);
    this.buffs = [];
    buffs.forEach((buff) => {
      this.addBuff(buff);
    });
    this.center();
  }

  addBuff(buff) {
    // will add a sprite to this container with a texture of `spell-${buff.name}`
    const sprite = new Sprite(this.scene, 0, 0, `spell-${buff.name}`);
    sprite.setScale(0.5);
    this.buffs.push({ name: buff.name, sprite: sprite });
    this.add(sprite);
    this.center();
  }

  removeBuff(buff) {
    // find a sprite in this.buffs with a texture of `spell-${buff.name}`
    const index = this.buffs.findIndex((b) => b.name === buff.name);
    if (index !== -1) {
      const sprite = this.buffs[index].sprite;
      this.remove(sprite, true, true);
      this.buffs.splice(index, 1);
    }
    this.center();
  }
  center() {
    // center all of the buffs based on the width
    let totalWidth = 0;
    const overlap = 4; // adjust this value to control the amount of overlap
    this.buffs.forEach((buff) => {
      buff.sprite.x = totalWidth + (buff.sprite.width * buff.sprite.scaleX - overlap) / 2;
      totalWidth += buff.sprite.width * buff.sprite.scaleX - overlap;
    });

    // calculate the center point of the container based on the width
    const center = totalWidth / 2;

    // adjust each buff's x position relative to the center point
    this.buffs.forEach((buff) => {
      buff.sprite.x -= center;
    });
  }

  compareBuffs(buffs) {
    const buffNames = buffs.map((buff) => buff.name);
    this.buffs.forEach((buff) => {
      if (!buffNames.includes(buff.name)) {
        this.removeBuff(buff);
      }
    });
    buffs.forEach((buff) => {
      if (!this.buffs.some((b) => b.name === buff.name)) {
        this.addBuff(buff);
      }
    });
  }
}

export default BuffRack;
