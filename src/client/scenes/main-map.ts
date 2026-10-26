import Phaser from "phaser";
import { Door } from "@/shared/door";
import { Sign } from "@/shared/sign";
import { MINI_MAP_SIZE } from "@/shared/utils";
import { changeMusic } from "@/client/audio/music";
import { getGameZoomLevel } from "./camera-zoom";

const { RectangleToRectangle } = Phaser.Geom.Intersects;

export function enableDoors(scene) {
  const coords = new Phaser.Geom.Rectangle();
  scene?.hero?.body?.getBounds(coords);
  for (const door of scene.doors.getChildren()) {
    if (!RectangleToRectangle(coords, door.getBounds())) door.isEnabled = true;
  }
}

function initMiniMap(scene, hero) {
  if (!hero || !scene?.map || !scene.minimap) return;

  // Only show the minimap if its enabled
  scene.minimap.setVisible(scene?.userSettings?.showMinimap);
  // Calculate the x-coordinate to position the minimap on the far right
  scene.minimap.setPosition(Math.round(scene.scale.width - MINI_MAP_SIZE), 0); // Rounded to the nearest integer

  // Set the bounds of the minimap to match the map's dimensions
  scene.minimap.setBounds(0, 0, scene.map.widthInPixels, scene.map.heightInPixels);

  // Set the zoom level for the minimap (adjust as needed)
  const minimapZoomLevel = 0.25;
  scene.minimap.setZoom(minimapZoomLevel);

  // Follow the hero with the minimap camera
  scene.minimap.startFollow(hero, true, 0.5, 0.5, 0, 0);
}

export function initCamera(scene, hero) {
  if (!hero || !scene?.map) return;
  const zoomLevel = getGameZoomLevel(scene);

  scene.cameras.main.setZoom(zoomLevel);
  scene.cameras.main.startFollow(hero, true, 1, 1, 0, hero.bodyOffsetY);
  scene.cameras.main.setBounds(0, 0, scene.map.widthInPixels, scene.map.heightInPixels);

  initMiniMap(scene, hero);
}

export function initPlayerCollision(scene, player, colliders = []) {
  scene.physics.world.colliders.destroy();
  scene.physics.world.setBounds(0, 0, scene.map.widthInPixels, scene.map.heightInPixels);
  player.body.setCollideWorldBounds(true);
  colliders.forEach((c) => {
    scene.physics.add.collider(player, c);
  });

  scene.physics.add.overlap(
    scene.hero,
    scene.doors,
    null,
    (hero, door) => {
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

export function changeMap(scene, roomName) {
  const tileSetKey = roomName?.split("-")?.[0];

  scene.roomName = roomName;
  scene.map = scene.make.tilemap({
    key: roomName,
  });
  changeMusic(scene);

  const tileSet = scene.map.addTilesetImage("tileset-" + tileSetKey);
  const tilesetShadows = scene.map.addTilesetImage("tileset-" + tileSetKey + "-shadows");
  const tilesetCollide = scene.map.addTilesetImage("tileset-collide");
  const tilesetExtras = scene.map.addTilesetImage("tileset-extras");
  const collideLayer = scene.map.createLayer("Collide", tilesetCollide).setCollisionByProperty({
    collides: true,
  });

  scene.map.createLayer("Ground", tileSet).setDepth(0);
  scene.map.createLayer("Shadows", tilesetShadows).setDepth(1);
  scene.map.createLayer("Overlay", tileSet).setDepth(2);
  scene.map.createLayer("Extras", tilesetExtras).setDepth(3);
  scene.map.createLayer("Above", tileSet).setDepth(9999);
  if (scene.animatedTiles) scene.animatedTiles.init(scene.map);

  /* Create Doors */
  const mapDoors = scene.map.getObjectLayer("Doors").objects;
  for (const door of mapDoors) {
    const newDoor = new Door(scene, door);
    scene.doors.add(newDoor);
  }
  /* Create Signs */
  if (scene.map.getObjectLayer("Signs")) {
    const mapSigns = scene.map.getObjectLayer("Signs").objects;
    for (const sign of mapSigns) {
      const newSign = new Sign(scene, sign);
      scene.signs.add(newSign);
    }
  }

  return { collideLayer };
}
