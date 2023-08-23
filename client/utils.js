import Player from "./game/Player";
import LootItem from "./game/LootItem";
import { distanceTo } from "@aether/shared";

function addPlayer(scene, user) {
  const player = new Player(scene, user);
  scene.add.existing(player);
  scene.players.add(player);
  return player;
}

function removePlayer(scene, socketId) {
  if (!scene.players) return;
  const player = getPlayer(scene, socketId);
  player?.destroy(true);
}

function resetEntities(scene) {
  scene?.map?.destroy?.(true);
  scene?.players?.destroy?.(true);
  scene?.npcs?.destroy?.(true);
  scene?.loots?.destroy?.(true);
  scene?.doors?.destroy?.(true);
  scene?.signs?.destroy?.(true);
  scene.players = scene.physics.add.group();
  scene.npcs = scene.physics.add.group();
  scene.loots = scene.physics.add.group();
  scene.doors = scene.physics.add.staticGroup();
  scene.signs = scene.physics.add.staticGroup();
}

function getPlayer(scene, socketId) {
  if (!scene.players) return;
  return scene.players.getChildren().find((player) => socketId === player.socketId);
}

function getNpc(scene, id) {
  if (!scene.npcs) return;
  return scene.npcs.getChildren().find((npc) => id === npc.id);
}

function getLoot(scene, id) {
  if (!scene.loots) return;
  return scene.loots.getChildren().find((loot) => id === loot.id);
}

function addLoot(scene, lootData) {
  const loot = new LootItem(scene, lootData);
  scene.add.existing(loot);
  scene.loots.add(loot);
  return loot;
}

function addNpc(scene, npcData) {
  const npc = new Player(scene, npcData);
  scene.add.existing(npc);
  scene.npcs.add(npc);
  return npc;
}

// Ensures sprite speed doesnt exceed maxVelocity while update is called (from Phaser example)
function constrainVelocity(sprite, maxVelocity) {
  if (!sprite || !sprite.body) return;

  var angle, currVelocitySqr, vx, vy;
  vx = sprite.body.velocity.x;
  vy = sprite.body.velocity.y;
  currVelocitySqr = vx * vx + vy * vy;

  if (currVelocitySqr > maxVelocity * maxVelocity) {
    angle = Math.atan2(vy, vx);
    vx = Math.cos(angle) * maxVelocity;
    vy = Math.sin(angle) * maxVelocity;
    sprite.body.velocity.x = vx;
    sprite.body.velocity.y = vy;
  }
}

function getSpinDirection(hero, point) {
  const dx = point.x - hero.x;
  const dy = point.y - hero.y;

  // determine which direction has the greatest distance
  if (Math.abs(dx) >= Math.abs(dy)) {
    // horizontal distance is greater than or equal to vertical distance
    if (dx > 0) {
      return "right";
    } else {
      return "left";
    }
  } else {
    // vertical distance is greater than horizontal distance
    if (dy > 0) {
      return "down";
    } else {
      return "up";
    }
  }
}

/* TODO: Move to DB */
const MUSIC_VOLUME = 0.05;
const SFX_VOLUME = 0.6;
const BLANK_TEXTURE = "human-blank";
const PLAYER_GRAB_RANGE = 32;

const playAudio = ({ scene, audioKey, caster }) => {
  const heroPosition = scene.hero?.body?.position;
  const casterPosition = { x: caster?.x, y: caster?.y };

  if (!audioKey) return;
  const audio = scene.sound.get(audioKey) || scene.sound.add(audioKey);

  // Calculate the distance between the hero and the caster
  const distance = distanceTo(heroPosition, casterPosition);

  // Adjust the volume based on the distance (example formula)
  const maxDistance = 500; // adjust this as needed
  const volume = SFX_VOLUME * (1 - distance / maxDistance);
  audio.setVolume(volume);

  audio.play();
};

function calculateZoomLevel({ viewportArea, baseZoom = 2, maxZoom = 4, divisor = 1000000 } = {}) {
  const viewportAreaInPixels = viewportArea; // multiply by square of pixel density
  const zoomLevel = Phaser.Math.Clamp(
    baseZoom + viewportAreaInPixels / divisor,
    baseZoom,
    maxZoom
  ).toFixed(2);
  return zoomLevel;
}

function getGameZoomLevel(scene) {
  const viewportArea = scene.cameras.main.width * scene.cameras.main.height;
  return Math.round(calculateZoomLevel({ viewportArea }));
}

function getHeroCoordsRelativeToWindow(scene) {
  const mainScene = scene?.scene?.manager?.getScene("SceneMain");
  const zoomLevel = getGameZoomLevel(mainScene);
  const camera = mainScene.cameras.main;
  const hero = mainScene?.hero;

  if (!hero) return { x: 0, y: 0 };

  // Calculate the hero's position relative to the camera
  const x = (hero.x - camera.worldView.x) * zoomLevel;
  const y = (hero.y - camera.worldView.y) * zoomLevel;

  return { x, y };
}

function deriveElements(stats = {}) {
  const elements = [];
  for (const [statKey, v] of Object.entries(stats)) {
    const statValue = Number(v);
    if (statKey === "maxFireDamage" && statValue > 0) {
      elements.push("fire");
    }
    if (statKey === "maxWaterDamage" && statValue > 0) {
      elements.push("water");
    }
    if (statKey === "maxLightDamage" && statValue > 0) {
      elements.push("light");
    }
    if (statKey === "maxEarthDamage" && statValue > 0) {
      elements.push("earth");
    }
  }
  return elements;
}

export {
  SFX_VOLUME,
  MUSIC_VOLUME,
  addPlayer,
  removePlayer,
  getPlayer,
  getNpc,
  addNpc,
  addLoot,
  getLoot,
  resetEntities,
  constrainVelocity,
  getSpinDirection,
  playAudio,
  calculateZoomLevel,
  getGameZoomLevel,
  getHeroCoordsRelativeToWindow,
  deriveElements,
  BLANK_TEXTURE,
  PLAYER_GRAB_RANGE,
};
