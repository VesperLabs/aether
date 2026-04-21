import Player from "./Player";
import { distanceTo } from "../shared";
class PlayerManager {
  public scene: ServerScene;
  public room: Room;
  public players: any;
  constructor(scene, room) {
    this.scene = scene;
    this.room = room;
    this.players = scene.physics.add.group({ immovable: true });
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
  add(socketId: string) {
    const { scene, room } = this;
    scene.players[socketId].room = room;
    scene.players[socketId].roomName = room?.name;
    this.players.add(scene.players[socketId]);
  }
  remove(socketId: string) {
    const { scene } = this;
    if (!scene?.players?.[socketId]) {
      return console.log("❌ Could not remove player");
    }
    scene.players[socketId].room = null;
    scene.players[socketId].roomName = null;
    this.players.remove(scene.players[socketId]);
  }
  getNearestPlayer(player1) {
    const players = this.players?.getChildren();

    let closestPlayer: ServerPlayer;
    let closestDistance = Infinity;

    players.forEach((player2: ServerPlayer) => {
      const distance = distanceTo(player2, player1);
      if (distance < closestDistance) {
        closestPlayer = player2;
        closestDistance = distance;
      }
    });

    return closestPlayer;
  }
  getPlayers() {
    return this.players?.getChildren();
  }
  hasPlayers() {
    return this?.players?.getChildren?.()?.length > 0;
  }
}

export default PlayerManager;
