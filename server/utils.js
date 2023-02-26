const Door = require("../client/src/Door");
const Player = require("./Player");
const { mapList } = require("../client/src/Maps");
const { Vault } = require("@geckos.io/snapshot-interpolation");
const crypto = require("crypto");

function createMapRooms(scene) {
  scene.mapRooms = mapList.reduce((acc, room) => {
    acc[room.name] = {
      name: room.name,
      map: scene.make.tilemap({ key: room.name }),
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

function createGridEngines(scene) {
  for (const mapRoom of Object.values(scene.mapRooms)) {
    const gridEngineConfig = {
      characters: [
        // {
        //   id: "player",
        //   sprite: playerSprite,
        //   walkingAnimationMapping: 6,
        // },
      ],
    };

    // mapRoom.gridEngine = scene.gridEngine.create(mapRoom.map, gridEngineConfig);
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

function changeMap(scene, socketId, prevDoor, nextDoor) {
  const player = scene.players[socketId];
  const room = prevDoor.destMap;
  player.room = room;
  player.x = nextDoor.centerPos.x;
  player.y = nextDoor.centerPos.y;
  removePlayer(scene, socketId);
  scene.add.existing(player);
  scene.mapRooms[room].players.add(player);
  return player;
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
  changeMap,
  createDoors,
  getDoor,
  isMobile,
  createGridEngines,
};
