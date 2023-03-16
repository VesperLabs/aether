import Player from "./Player";
import LootItem from "./LootItem";

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
  scene.players = scene.physics.add.group();
  scene.npcs = scene.physics.add.group();
  scene.loots = scene.physics.add.group();
  scene.doors = scene.physics.add.staticGroup();
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

function getHeroSpin(hero, point) {
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

const isTouchScreen =
  "ontouchstart" in window || navigator?.maxTouchPoints > 0 || navigator?.msMaxTouchPoints > 0;

export {
  addPlayer,
  removePlayer,
  getPlayer,
  getNpc,
  addNpc,
  addLoot,
  getLoot,
  resetEntities,
  constrainVelocity,
  getHeroSpin,
  isTouchScreen,
};
