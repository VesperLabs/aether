import Player from "./Player";
import { calculateStats } from "./utils";

class PlayerManager {
  constructor(scene, room) {
    this.players = [];
    this.scene = scene;
    this.room = room;
  }
  create(user) {
    const { scene, room } = this;
    const id = crypto.randomUUID();
    const socketId = user?.socketId;
    scene.players[socketId] = new Player(scene, {
      id,
      ...user,
      room,
      isServer: true,
      stats: calculateStats(user),
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
