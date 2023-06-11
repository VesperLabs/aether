import crypto from "crypto";
import Npc from "./Npc";
import nasties from "../shared/data/nasties.json";
import keepers from "../shared/data/keepers.json";
import mapNpcs from "../shared/data/mapNpcs.json"; //todo need these to live in maps
import { useGetBaseCharacterDefaults, mergeAndAddValues } from "./utils";

const mobsByKind = {
  nasty: nasties,
  keeper: keepers,
};

class NpcManager {
  public scene: ServerScene;
  public room: Room;
  public npcs: any;
  constructor(scene: ServerScene, room: Room) {
    this.scene = scene;
    this.room = room;
    this.npcs = scene.physics.add.group();
  }
  spawnNpcs() {
    const { room } = this;
    const npcs = mapNpcs[room.name];
    for (const npc of npcs) {
      const mobData = mobsByKind[npc.kind][npc.name];
      const isKeeper = npc.kind === "keeper";

      const { baseStats } = useGetBaseCharacterDefaults({
        level: mobData?.baseStats?.level,
        charClass: mobData?.charClass,
      });

      /* Modifications to base stats for NPCs */
      const npcBaseStats = {
        ...baseStats,
        walkSpeed: baseStats.walkSpeed - 30,
        minDamage: mobData?.baseStats?.level / 2,
        maxDamage: mobData?.baseStats?.level,
        expValue: isKeeper ? 0 : mobData?.baseStats?.level,
      };

      this.create({
        ...mobData,
        //need to merge these keys together, but add their values
        baseStats: mergeAndAddValues(npcBaseStats, mobData?.baseStats),
        name: npc.name,
        room,
        kind: npc?.kind,
        x: npc?.x,
        y: npc?.y,
        startingCoords: { x: npc?.x, y: npc?.y },
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
    //scene.physics.add.collider(npcs, room.playerManager.players);
    room.colliders.forEach((c) => {
      scene.physics.add.collider(npcs, c);
    });
  }
  getNpcs() {
    return this?.npcs?.getChildren();
  }
}

export default NpcManager;
