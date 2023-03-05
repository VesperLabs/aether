import Room from "./Room";
import { mapList } from "../src/Maps";

class RoomManager {
  constructor(scene) {
    this.rooms = {};
    this.scene = scene;
    this.createRooms();
  }
  createRoom(name) {
    this.rooms[name] = new Room(this.scene, { name });
  }
  createRooms() {
    for (const { name } of mapList) {
      this.createRoom(name);
    }
  }
}

export default RoomManager;
