import NpcManager from "./NpcManager.js";
import PlayerManager from "./PlayerManager.js";
import Door from "../src/Door";
// import LootFactory from "./LootFactory.js";
const { Vault } = require("@geckos.io/snapshot-interpolation");

class Room {
  constructor(scene, { name }) {
    this.scene = scene;
    this.tileMap = scene.make.tilemap({ key: name });
    this.name = name;
    this.players = scene.physics.add.group();
    this.doors = scene.physics.add.group();
    this.npcs = scene.physics.add.group();
    this.vault = new Vault();
    this.npcManager = new NpcManager(this.scene, this);
    this.playerManager = new PlayerManager(this.scene, this);
    // this.lootFactory = new LootFactory(this);
    this.createColliders();
    this.createDoors();
    this.npcManager.spawnNpcs();
    this.npcManager.setNpcCollision();
  }
  addPlayer(player) {
    player.room = this;
    this.players.add(player);
  }
  removePlayer(player) {
    player.room = null;
    this.players.remove(player);
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
    const collideLayer = this.tileMap.createLayer("Collide").setCollisionByProperty({
      collides: true,
    });
    const { top, left, bottom, right } = this.createMapBounds();
    this.colliders = [collideLayer, top, left, bottom, right];
  }
  createMapBounds() {
    const { scene, tileMap } = this;
    const top = scene.physics.add.sprite(0, 0, "blank");
    top.displayWidth = tileMap.widthInPixels;
    top.displayHeight = 0;
    top.body.immovable = true;
    top.setOrigin(0, 0);
    const left = scene.physics.add.sprite(0, 0, "blank");
    left.displayWidth = 0;
    left.displayHeight = tileMap.heightInPixels;
    left.body.immovable = true;
    left.setOrigin(0, 0);
    const bottom = scene.physics.add.sprite(0, tileMap.heightInPixels, "blank");
    bottom.displayWidth = tileMap.widthInPixels;
    bottom.displayHeight = 0;
    bottom.body.immovable = true;
    bottom.setOrigin(0, 0);
    const right = scene.physics.add.sprite(tileMap.widthInPixels, 0, "blank");
    right.displayWidth = 0;
    right.displayHeight = tileMap.heightInPixels;
    right.body.immovable = true;
    right.setOrigin(0, 0);
    return { top, left, bottom, right };
  }
}

export default Room;
