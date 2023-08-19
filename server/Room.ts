import NpcManager from "./NpcManager";
import PlayerManager from "./PlayerManager";
import Door from "../shared/Door";
import LootManager from "./LootManager";
import SpellManager from "./SpellManager";
import EasyStar from "easystarjs";
import { Vault } from "@geckos.io/snapshot-interpolation";

class Room {
  public scene: ServerScene;
  public tileMap: Phaser.Tilemaps.Tilemap;
  public collideLayer: Phaser.Tilemaps.TilemapLayer;
  public name: string;
  public doors: Phaser.Physics.Arcade.Group;
  public vault: Vault;
  public npcManager: NpcManager;
  public playerManager: PlayerManager;
  public lootManager: LootManager;
  public spellManager: SpellManager;
  public easystar: EasyStar.js;
  public colliders: Array<any>;

  constructor(scene: ServerScene, { name }: { name: string }) {
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
    this.easystar = this.createPathGrid();
    this.createDoors();
    this.npcManager.spawnNpcs();
    this.npcManager.setNpcCollision();
  }
  createDoors() {
    const { name, doors, scene } = this;
    this.tileMap
      .getObjectLayer("Doors")
      .objects?.forEach((door: Phaser.Types.Tilemaps.TiledObject) => {
        if (!scene?.doors?.[name]) {
          scene.doors[name] = { id: null, name: null, type: null };
        }
        scene.doors[name][door.name] = new Door(scene, door);
        doors.add(scene.doors[name][door.name]);
      });
  }
  createColliders() {
    this.collideLayer = this.tileMap.createLayer("Collide", null).setCollisionByProperty({
      collides: true,
    });
    const { top, left, bottom, right } = this.createMapBounds();
    this.colliders = [this.collideLayer, top, left, bottom, right];
  }
  createPathGrid() {
    const { collideLayer } = this;
    // Create an EasyStar grid from the collideLayer data
    const grid = [];
    for (let y = 0; y < collideLayer.layer.height; y++) {
      const row = [];
      for (let x = 0; x < collideLayer.layer.width; x++) {
        const tile = collideLayer.layer.data[y][x];
        row.push(tile.collides ? 1 : 0);
      }
      grid.push(row);
    }
    const easystar = new EasyStar.js();
    easystar.setGrid(grid);
    easystar.enableSync();
    easystar.setAcceptableTiles([0]);
    easystar.enableDiagonals();
    //easystar.enableCornerCutting();
    easystar.setIterationsPerCalculation(1000);
    easystar.setTileCost(1, 1);
    easystar.setTileCost(0, 0);
    return easystar;
  }
  findPath(player: Npc, targetCoords: Coordinate) {
    const { collideLayer, easystar } = this ?? {};
    const TILE_SIZE = collideLayer.layer.tileWidth;
    const startX = Math.floor(player.x / TILE_SIZE);
    const startY = Math.floor(player.y / TILE_SIZE);
    const endX = Math.floor(targetCoords.x / TILE_SIZE);
    const endY = Math.floor(targetCoords.y / TILE_SIZE);

    easystar.findPath(startX, startY, endX, endY, (path) => {
      const nextPath = path?.map((tile) => ({
        x: tile.x * TILE_SIZE + TILE_SIZE / 2,
        y: tile.y * TILE_SIZE + TILE_SIZE / 2,
      }))?.[1];
      if (JSON.stringify(nextPath) !== JSON.stringify(player?.nextPath)) player.nextPath = nextPath;
    });

    easystar.calculate();
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
