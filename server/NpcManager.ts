import crypto from "crypto";
import Npc from "./Npc";
import nasties from "../shared/data/nasties.json";
import keepers from "../shared/data/keepers.json";
import { useGetBaseCharacterDefaults, mergeAndAddValues } from "./utils";

/* Find NPCs in data lists, and add `kind` to them */
const getNpcFromLists = (name) => {
  const keeperKeys = Object.keys(keepers);
  const nastyKeys = Object.keys(nasties);
  if (keeperKeys.find((key) => key === name)) {
    return { ...keepers[name], kind: "keeper" };
  }
  if (nastyKeys.find((key) => key === name)) {
    return { ...nasties[name], kind: "nasty" };
  }
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
    const mapNpcs = this?.room?.tileMap?.getObjectLayer("Npcs")?.objects || [];

    for (const { name, x, y, properties = [] } of mapNpcs) {
      const npc = getNpcFromLists(name);
      if (!npc) {
        console.log(`❌ Map npc "${name}" is broken or not found in ${room.name}`);
        continue;
      }
      const isKeeper = npc.kind === "keeper";

      const { baseStats } = useGetBaseCharacterDefaults({
        level: npc?.baseStats?.level,
        charClass: npc?.charClass,
      });

      /* Modifications to base stats for NPCs */
      const npcBaseStats = {
        ...baseStats,
        walkSpeed: baseStats.walkSpeed - 30,
        maxHp: npc?.baseStats?.level * 5,
        expValue: isKeeper ? 0 : npc?.baseStats?.level,
      };

      this.create({
        ...npc,
        //need to merge these keys together, but add their values
        baseStats: mergeAndAddValues(npcBaseStats, npc?.baseStats),
        name,
        room,
        kind: npc?.kind,
        x,
        y,
        state: {
          ...npc.state,
          ...properties?.reduce((obj, item) => {
            obj[item.name] = item.value;
            return obj;
          }, {}),
        },
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
