import Phaser from "phaser";
import { Door, type DoorObject } from "@/client/views/door";
import { Sign, type SignObject } from "@/client/views/sign";
import { changeMusic } from "@/client/audio/music";
import type { Player } from "@/client/views/player";
import { getGameZoomLevel } from "./camera-zoom";
import { layoutMinimap } from "./minimap";
import type { SceneMain } from "./main-scene";

const { RectangleToRectangle } = Phaser.Geom.Intersects;

export function enableDoors(scene: SceneMain) {
  const coords = new Phaser.Geom.Rectangle();
  scene?.hero?.body?.getBounds(coords);
  for (const door of scene.doors.getChildren() as Door[]) {
    if (!RectangleToRectangle(coords, door.getBounds())) door.isEnabled = true;
  }
}

export function initCamera(scene: SceneMain, hero: Player) {
  if (!hero || !scene?.map) return;
  const zoomLevel = getGameZoomLevel(scene);

  scene.cameras.main.setZoom(zoomLevel);
  scene.cameras.main.startFollow(hero, true, 1, 1, 0, hero.bodyOffsetY);
  scene.cameras.main.setBounds(0, 0, scene.map.widthInPixels, scene.map.heightInPixels);

  layoutMinimap(scene, hero);
}

export function initPlayerCollision(
  scene: SceneMain,
  player: Player,
  colliders: Phaser.Tilemaps.TilemapLayer[] = [],
) {
  scene.physics.world.colliders.destroy();
  scene.physics.world.setBounds(0, 0, scene.map.widthInPixels, scene.map.heightInPixels);
  player.body.setCollideWorldBounds(true);
  colliders.forEach((c) => {
    scene.physics.add.collider(player, c);
  });

  scene.physics.add.overlap(
    scene.hero,
    scene.doors,
    undefined,
    (heroObject, doorObject) => {
      const hero = heroObject as Player;
      const door = doorObject as Door;
      /* If they spawned on the door, ignore it for now */
      const { x, y } = hero.startingCoords;
      if (door.getBounds().contains(x, y)) {
        door.heroSpawn = true;
      }
      /* If the door is not disabled let it teleport */
      if (!door.heroSpawn || door.isEnabled) {
        player.state.isEnteringDoor = true;
        door.destroy();
        /* Wait for the door to go away before emitting the event */
        setTimeout(() => {
          scene.socket.emit("enterDoor", door.name);
        }, 1);
      }
    },
    scene,
  );
}

export function changeMap(scene: SceneMain, roomName: string) {
  const tileSetKey = roomName?.split("-")?.[0];

  scene.roomName = roomName;
  scene.map = scene.make.tilemap({
    key: roomName,
  });
  changeMusic(scene);

  const { map } = scene;
  // The map assets are bundled, so a missing tileset or layer is a build error, not a runtime case.
  const addTileset = (key: string) => map.addTilesetImage(key) as Phaser.Tilemaps.Tileset;
  const createLayer = (name: string, tileset: Phaser.Tilemaps.Tileset) =>
    map.createLayer(name, tileset) as Phaser.Tilemaps.TilemapLayer;

  const tileSet = addTileset("tileset-" + tileSetKey);
  const tilesetShadows = addTileset("tileset-" + tileSetKey + "-shadows");
  const tilesetCollide = addTileset("tileset-collide");
  const tilesetExtras = addTileset("tileset-extras");
  const collideLayer = createLayer("Collide", tilesetCollide).setCollisionByProperty({
    collides: true,
  });

  createLayer("Ground", tileSet).setDepth(0);
  createLayer("Shadows", tilesetShadows).setDepth(1);
  createLayer("Overlay", tileSet).setDepth(2);
  createLayer("Extras", tilesetExtras).setDepth(3);
  createLayer("Above", tileSet).setDepth(9999);
  if (scene.animatedTiles) scene.animatedTiles.init(scene.map);

  /* Create Doors */
  const mapDoors = (scene.map.getObjectLayer("Doors") as Phaser.Tilemaps.ObjectLayer).objects;
  for (const door of mapDoors) {
    const newDoor = new Door(scene, door as DoorObject);
    scene.doors.add(newDoor);
  }
  /* Create Signs */
  if (scene.map.getObjectLayer("Signs")) {
    const mapSigns = (scene.map.getObjectLayer("Signs") as Phaser.Tilemaps.ObjectLayer).objects;
    for (const sign of mapSigns) {
      const newSign = new Sign(scene, sign as SignObject);
      scene.signs.add(newSign);
    }
  }

  return { collideLayer };
}
