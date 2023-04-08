//@ts-nocheck

function handlePlayerInput(scene, socketId, input) {
  if (!scene.players) return;
  const { x, y, vx, vy, direction } = input;
  const player = getPlayer(scene, socketId);
  if (!player) return;
  if (player.state.isDead) return;
  player.x = x;
  player.y = y;
  player.vx = vx;
  player.vy = vy;
  player.direction = direction;
}

function removePlayer(scene, socketId) {
  const player = scene.players[socketId];
  player?.destroy(true);
  delete scene.players?.[socketId];
}

function getPlayer(scene, socketId) {
  return scene.players[socketId];
}

function getDoor(scene, roomName, doorName) {
  return scene?.doors?.[roomName]?.[doorName];
}

function getRoomState(scene: ServerScene, roomName: String): RoomState {
  return {
    players: Object.values(scene.players)
      ?.filter((p) => p?.room?.name === roomName)
      .map((p) => getCharacterState(p)),
    npcs: Object.values(scene.npcs)
      ?.filter((n) => n?.room?.name === roomName)
      .map((p) => getCharacterState(p)),
    spells: Object.values(scene.spells)
      ?.filter((s) => s?.room?.name === roomName)
      .map((s) => s?.getTrimmed()),
    loots: Object.values(scene.loots)?.filter((l) => l?.roomName === roomName),
  };
}

function getCharacterState(p: Character): CharacterState {
  const uid = p?.socketId || p?.id;
  return {
    id: uid, //required for SI
    socketId: uid,
    roomName: p?.room?.name,
    x: p?.x,
    y: p?.y,
    vx: p?.vx,
    vy: p?.vy,
    direction: p?.direction,
    stats: p?.stats,
    state: p?.state,
    equipment: p?.equipment,
    inventory: p?.inventory,
    profile: p?.profile,
    kind: p?.kind,
    charClass: p?.charClass,
    gold: p?.gold,
  };
}

function getTrimmedRoomState(scene: ServerScene, roomName: string): TrimmedRoomState {
  return {
    players: Object.values(scene.players)
      ?.filter((p) => p?.room?.name === roomName)
      .map(getTrimmedCharacterState),
    npcs: Object.values(scene.npcs)
      ?.filter((p) => p?.room?.name === roomName)
      .map(getTrimmedCharacterState),
    spells: Object.values(scene.spells)
      ?.filter((s) => s?.room?.name === roomName)
      .map((s) => s?.getTrimmed()),
    loots: Object.values(scene.loots)?.filter((l) => l?.roomName === roomName),
  };
}

function getTrimmedCharacterState(p: Character): TrimmedCharacterState {
  const uid = p?.socketId || p?.id;
  return {
    id: uid, //required for SI
    socketId: uid,
    roomName: p?.room?.name,
    direction: p?.direction,
    state: p?.state,
    x: p?.x,
    y: p?.y,
    vx: p?.vx,
    vy: p?.vy,
  };
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getCharacterDirection(character, point) {
  const dx = point.x - character.x;
  const dy = point.y - character.y;

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

function distanceTo(first, second) {
  let dx = second?.x - first?.x;
  let dy = second?.y - first?.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function cloneObject(obj) {
  return obj ? JSON.parse(JSON.stringify(obj)) : null;
}

function checkSlotsMatch(s1, s2) {
  const handNames = ["handLeft", "handRight"];
  const ringNames = ["ring1", "ring2"];
  if (s1 === s2) return true;
  if (s1 === "hands" && handNames?.includes(s2)) return true;
  if (s2 === "hands" && handNames?.includes(s1)) return true;
  if (s1 === "ring" && ringNames?.includes(s2)) return true;
  if (s2 === "ring" && ringNames?.includes(s1)) return true;
  return false;
}

export {
  removePlayer,
  getPlayer,
  getTrimmedRoomState,
  getTrimmedCharacterState,
  getRoomState,
  getCharacterState,
  handlePlayerInput,
  getDoor,
  randomNumber,
  getCharacterDirection,
  distanceTo,
  cloneObject,
  checkSlotsMatch,
};
