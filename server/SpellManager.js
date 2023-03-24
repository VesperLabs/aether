import crypto from "crypto";
import Spell from "./Spell";

class SpellManager {
  constructor(scene, room) {
    this.scene = scene;
    this.room = room;
    this.spells = scene.physics.add.group();
  }
  create(spellData) {
    const { scene, room, spells } = this;
    const id = crypto.randomUUID();
    scene.spells[id] = new Spell(scene, { id, room, ...spellData });
    scene.add.existing(scene.spells[id]);
    spells.add(scene.spells[id]);
    return scene?.spells?.[id];
  }
  expireSpells() {
    const { spells, scene } = this;
    for (const spell of spells?.getChildren()) {
      if (spell?.state?.isExpired) {
        this.remove(spell?.id);
      }
    }
  }
  remove(id) {
    const { scene } = this;
    if (!scene?.spells?.[id]) {
      return console.log("❌ Could not remove spell");
    }
    this.spells.remove(scene.spells[id]);
    scene.spells[id]?.destroy(true);
    delete scene.spells?.[id];
  }
}

export default SpellManager;
