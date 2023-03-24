import crypto from "crypto";
import Npc from "./Npc";
import ItemBuilder from "./ItemBuilder";
import nasties from "./data/nasties.json";
import keepers from "./data/keepers.json";
import mapNpcs from "./data/mapNpcs.json"; //todo need these to live in maps

const mobsByKind = {
  nasty: nasties,
  keeper: keepers,
};

class NpcManager {
  constructor(scene, room) {
    this.scene = scene;
    this.room = room;
    this.npcs = scene.physics.add.group();
  }
  spawnNpcs() {
    const { room } = this;
    const npcs = mapNpcs[room.name];
    for (const npc of npcs) {
      const { equipment = {}, ...mobData } = mobsByKind[npc.kind][npc.name];
      this.create({
        ...mobData,
        room,
        kind: npc?.kind,
        x: npc?.x,
        y: npc?.y,
        startingCoords: { x: npc?.x, y: npc?.y },
        equipment: Object?.entries(equipment).reduce((acc, [slot, itemArray]) => {
          acc[slot] = itemArray?.length ? ItemBuilder.buildItem(...itemArray) : null;
          return acc;
        }, {}),
      });
    }
  }
  create(user) {
    const { scene, room, npcs } = this;
    const id = crypto.randomUUID();
    scene.npcs[id] = new Npc(scene, { id, room, ...user });
    scene.add.existing(scene.npcs[id]);
    npcs.add(scene.npcs[id]);
  }
  setNpcCollision() {
    const { scene, room, npcs } = this;
    scene.physics.add.collider(npcs, room.playerManager.players);
    room.colliders.forEach((c) => {
      scene.physics.add.collider(npcs, c);
    });
  }
}

export default NpcManager;
