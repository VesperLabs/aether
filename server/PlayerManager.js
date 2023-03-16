import Player from "./Player";
class PlayerManager {
  constructor(scene, room) {
    this.scene = scene;
    this.room = room;
    this.players = scene.physics.add.group();
  }
  create(user) {
    const { scene, room } = this;
    const socketId = user?.socketId;
    scene.players[socketId] = new Player(scene, {
      ...user,
      id: socketId,
      room,
      roomName: room?.name,
    });
    scene.add.existing(scene.players[socketId]);
    this.players.add(scene.players[socketId]);
    return scene.players[socketId];
  }
  add(socketId) {
    const { scene, room } = this;
    scene.players[socketId].room = room;
    scene.players[socketId].roomName = room?.name;
    this.players.add(scene.players[socketId]);
  }
  remove(socketId) {
    const { scene } = this;
    scene.players[socketId].room = null;
    scene.players[socketId].roomName = null;
    this.players.remove(scene.players[socketId]);
  }
}

export default PlayerManager;
