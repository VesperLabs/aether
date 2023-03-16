import Player from "./Player";
class PlayerManager {
  constructor(scene, room) {
    this.scene = scene;
    this.room = room;
  }
  create(user) {
    const { scene, room } = this;
    const socketId = user?.socketId;
    scene.players[socketId] = new Player(scene, {
      ...user,
      id: socketId,
      room,
    });
    scene.add.existing(scene.players[socketId]);
    room.addPlayer(scene.players[socketId]);
    return scene.players[socketId];
  }
  add(socketId) {
    const { scene, room } = this;
    room.addPlayer(scene.players[socketId]);
  }
  remove(socketId) {
    const { scene, room } = this;
    room.removePlayer(scene.players[socketId]);
  }
}

export default PlayerManager;
