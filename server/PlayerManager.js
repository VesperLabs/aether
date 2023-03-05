import Player from "./Player";
import { calculateStats } from "./utils";

class PlayerManager {
  constructor(scene, room) {
    this.scene = scene;
    this.room = room;
  }
  addPlayer(user) {
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
    room.players.add(scene.players[socketId]);
    return scene.players[socketId];
  }
}

export default PlayerManager;
