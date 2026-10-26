import Phaser from "phaser";
import type { ActiveBuff } from "@/shared/rules/buffs";

const Sprite = Phaser.GameObjects.Sprite;

export class BuffRack extends Phaser.GameObjects.Container {
  declare buffs: Array<{ name: string; sprite: Phaser.GameObjects.Sprite }>;
  constructor(scene: Phaser.Scene, x: number, y: number, buffs: ActiveBuff[] = []) {
    super(scene, x, y);
    this.buffs = [];
    buffs.forEach((buff) => {
      this.addBuff(buff);
    });
    this.center();
  }

  addBuff(buff: ActiveBuff) {
    // will add a sprite to this container with a texture of `spell-${buff.name}`
    const sprite = new Sprite(this.scene, 0, 0, `spell-${buff.name}`);
    sprite.setScale(0.5);
    this.buffs.push({ name: buff.name, sprite: sprite });
    this.add(sprite);
    this.center();
  }

  removeBuff(buff: ActiveBuff) {
    // find a sprite in this.buffs with a texture of `spell-${buff.name}`
    const index = this.buffs.findIndex((b) => b.name === buff.name);
    if (index !== -1) {
      const sprite = this.buffs[index].sprite;
      this.remove(sprite, true);
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

  compareBuffs(buffs: ActiveBuff[]) {
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
