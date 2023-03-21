import NpcManager from "./NpcManager.js";
import PlayerManager from "./PlayerManager.js";
import Door from "../src/Door";
import LootManager from "./LootManager.js";
import SpellManager from "./SpellManager.js";
// import LootFactory from "./LootFactory.js";
const { Vault } = require("@geckos.io/snapshot-interpolation");

class Room {
  constructor(scene, { name }) {
    this.scene = scene;
    this.tileMap = scene.make.tilemap({ key: name });
    this.name = name;
    this.doors = scene.physics.add.group();
    this.vault = new Vault();
    this.npcManager = new NpcManager(this.scene, this);
    this.playerManager = new PlayerManager(this.scene, this);
    this.lootManager = new LootManager(this.scene, this);
    this.spellManager = new SpellManager(this.scene, this);
    this.createColliders();
    this.createDoors();
    this.npcManager.spawnNpcs();
    this.npcManager.setNpcCollision();
  }
  createDoors() {
    const { name, doors, scene } = this;
    this.tileMap.getObjectLayer("Doors").objects?.forEach((door) => {
      if (!scene?.doors?.[name]) {
        scene.doors[name] = {};
      }
      scene.doors[name][door.name] = new Door(scene, door);
      doors.add(scene.doors[name][door.name]);
    });
  }
  createColliders() {
    this.collideLayer = this.tileMap.createLayer("Collide").setCollisionByProperty({
      collides: true,
    });
    const { top, left, bottom, right } = this.createMapBounds();
    this.colliders = [this.collideLayer, top, left, bottom, right];
  }
  createMapBounds() {
    const { scene, tileMap } = this;
    const top = scene.physics.add.sprite(-100, -100, "blank");
    top.displayWidth = tileMap.widthInPixels + 200;
    top.displayHeight = 100;
    top.body.immovable = true;
    top.setOrigin(0, 0);
    const left = scene.physics.add.sprite(-100, -100, "blank");
    left.displayWidth = 100;
    left.displayHeight = tileMap.heightInPixels + 200;
    left.body.immovable = true;
    left.setOrigin(0, 0);
    const bottom = scene.physics.add.sprite(-100, tileMap.heightInPixels, "blank");
    bottom.displayWidth = tileMap.widthInPixels + 200;
    bottom.displayHeight = 100;
    bottom.body.immovable = true;
    bottom.setOrigin(0, 0);
    const right = scene.physics.add.sprite(tileMap.widthInPixels, -100, "blank");
    right.displayWidth = 100;
    right.displayHeight = tileMap.heightInPixels + 200;
    right.body.immovable = true;
    right.setOrigin(0, 0);
    return { top, left, bottom, right };
  }
}

export default Room;
