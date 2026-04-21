import Room from "./Room";
import { mapList } from "../shared/Maps";

class RoomManager {
  public scene: ServerScene;
  public rooms: Record<string, Room>;

  constructor(scene: ServerScene) {
    this.rooms = {};
    this.scene = scene;
    this.createRooms();
  }
  createRoom(name: string) {
    this.rooms[name] = new Room(this.scene, { name });
  }
  createRooms() {
    for (const { name } of mapList) {
      this.createRoom(name);
    }
  }
}

export default RoomManager;
