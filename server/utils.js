const Door = require("../client/src/Door");
const Player = require("./Player");
const { mapList } = require("../client/src/Maps");
const { Vault } = require("@geckos.io/snapshot-interpolation");
const crypto = require("crypto");

function createMapRooms(scene) {
  scene.mapRooms = mapList.reduce((acc, room) => {
    const tileMap = scene.make.tilemap({ key: room.name });
    /* Create bounds */
    const collideLayer = tileMap.createLayer("Collide").setCollisionByProperty({
      collides: true,
    });

    const top = scene.physics.add.sprite(0, 0, "coin");
    top.displayWidth = tileMap.widthInPixels;
    top.displayHeight = 0;
    top.body.immovable = true;
    top.setOrigin(0, 0);
    const left = scene.physics.add.sprite(0, 0, "coin");
    left.displayWidth = 0;
    left.displayHeight = tileMap.heightInPixels;
    left.body.immovable = true;
    left.setOrigin(0, 0);
    const bottom = scene.physics.add.sprite(0, tileMap.heightInPixels, "coin");
    bottom.displayWidth = tileMap.widthInPixels;
    bottom.displayHeight = 0;
    bottom.body.immovable = true;
    bottom.setOrigin(0, 0);
    const right = scene.physics.add.sprite(tileMap.widthInPixels, 0, "coin");
    right.displayWidth = 0;
    right.displayHeight = tileMap.heightInPixels;
    right.body.immovable = true;
    right.setOrigin(0, 0);

    acc[room.name] = {
      name: room.name,
      map: tileMap,
      colliders: [collideLayer, top, left, bottom, right],
      players: scene.physics.add.group(),
      doors: scene.physics.add.group(),
      npcs: scene.physics.add.group(),
      vault: new Vault(),
    };

    return acc;
  }, {});
}

function createDoors(scene) {
  for (const mapRoom of Object.values(scene.mapRooms)) {
    mapRoom.map.getObjectLayer("Doors").objects?.forEach((door) => {
      if (!scene.doors[mapRoom.name]) {
        scene.doors[mapRoom.name] = {};
      }
      scene.doors[mapRoom.name][door.name] = new Door(scene, door);
      return scene.doors[mapRoom.name][door.name];
    });
  }
}

function handlePlayerInput(scene, socketId, input) {
  if (!scene.players) return;
  const { x, y, vx, vy } = input;
  const player = getPlayer(scene, socketId);
  if (!player) return;
  player.x = x;
  player.y = y;
  player.vx = vx;
  player.vy = vy;
}

function addPlayer(scene, user) {
  const id = crypto.randomUUID();
  const socketId = user?.socketId;
  scene.players[socketId] = new Player(scene, { id, ...user, isServer: true });
  scene.add.existing(scene.players[socketId]);
  scene.mapRooms[user.room].players.add(scene.players[socketId]);
  return scene.players[socketId];
}

function removePlayer(scene, socketId) {
  scene.players?.[socketId]?.destroy();
}

function removeAllPlayers(scene, socketId) {
  for (socketId of Object.keys(scene.players)) {
    removePlayer(scene, socketId);
  }
}

function getPlayer(scene, socketId) {
  return scene.players[socketId];
}

function getDoor(scene, room, doorName) {
  return scene?.doors?.[room]?.[doorName];
}

function getFullRoomState(scene, room) {
  return {
    players: Object.values(scene.players)
      ?.filter((p) => p?.room === room)
      .map(getFullCharacterState),
    npcs: Object.values(scene.npcs)
      ?.filter((n) => n?.room === room)
      .map(getFullCharacterState),
  };
}

function getFullCharacterState(p) {
  const uid = p?.socketId || p?.id;
  return {
    id: uid, //required for SI
    socketId: uid,
    room: p?.room,
    x: p?.x,
    y: p?.y,
    vx: p?.vx,
    vy: p?.vy,
    equips: p?.equips,
    profile: p?.profile,
  };
}

function getTrimmedRoomState(scene, room) {
  return {
    players: Object.values(scene.players)
      ?.filter((p) => p?.room === room)
      .map(getTrimmedCharacterState),
    npcs: Object.values(scene.npcs)
      ?.filter((p) => p?.room === room)
      .map(getTrimmedCharacterState),
  };
}

function getTrimmedCharacterState(p) {
  const uid = p?.socketId || p?.id;
  return {
    id: uid, //required for SI
    socketId: uid,
    room: p?.room,
    x: p?.x,
    y: p?.y,
    vx: p?.vx,
    vy: p?.vy,
  };
}

function getTrimmedCharacterState(p) {
  const uid = p?.socketId || p?.id;
  return {
    id: uid, //required for SI
    socketId: uid,
    room: p?.room,
    x: p?.x,
    y: p?.y,
    vx: p?.vx,
    vy: p?.vy,
  };
}

function setNpcCollision(scene) {
  for (const mapRoom of Object.values(scene.mapRooms)) {
    mapRoom.colliders.forEach((c) => {
      scene.physics.add.collider(mapRoom.npcs, c);
    });
  }
}

const isMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

module.exports = {
  addPlayer,
  removePlayer,
  getPlayer,
  getTrimmedRoomState,
  getTrimmedCharacterState,
  getFullRoomState,
  getFullCharacterState,
  handlePlayerInput,
  removeAllPlayers,
  createMapRooms,
  createDoors,
  getDoor,
  setNpcCollision,
  isMobile,
};
