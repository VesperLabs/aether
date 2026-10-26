import { DEFAULT_USER_SETTINGS } from "@/shared/rules/world";
import { heroInitToTickExpanded, expandTickState } from "@/shared/network/sync";
import { netInterp } from "@/client/net/scene-interpolation";
import { playAudio } from "@/client/audio/play-audio";
import {
  addPlayer,
  getPlayer,
  resetEntities,
  removePlayer,
  getNpc,
  addNpc,
  addLoot,
  getLoot,
} from "@/client/scenes/scene-entities";
import { changeMap, initCamera, initPlayerCollision } from "@/client/scenes/main-map";

/** Registers every server message the main scene reacts to. */
export function bindSceneSocket(scene) {
  const socket = scene.socket;

  socket.on("update", (snapshot) => {
    /* Ignore ticks that arrive before heroInit has created the entity groups */
    if (!snapshot?.state || !scene.loots) return;
    const expanded = { ...snapshot, state: expandTickState(snapshot.state) };
    netInterp.addSnapshot(expanded);
    for (const loot of scene?.loots?.getChildren() ?? []) {
      if (expanded?.state?.loots?.find((l) => l?.id === loot?.id && l?.expiredSince)) {
        loot.destroy(true);
      }
    }
    for (const s of expanded?.state?.npcs ?? []) {
      const npc = getNpc(scene, s.id);
      npc.updateState(s?.state);
      npc.doRegen();
    }
    for (const s of expanded?.state?.players ?? []) {
      const player = getPlayer(scene, s.id);
      player.updateState(s?.state);
      player.doRegen();
    }
  });

  socket.on("partyUpdate", ({ party }) => {
    scene.hero.party = party;
  });

  socket.on("heroInit", (args) => {
    const { socketId, players = [], npcs = [], loots = [] } = args ?? {};
    if (args && Object.prototype.hasOwnProperty.call(args, "userSettings")) {
      scene.userSettings = { ...DEFAULT_USER_SETTINGS, ...args.userSettings };
    }
    /* Delete everything in the scene */
    resetEntities(scene);
    netInterp.seedFromHeroInit(heroInitToTickExpanded({ players, npcs, loots }));
    /* Add players that don't exist */
    for (const player of players) {
      if (getPlayer(scene, player.socketId)) continue;
      if (socketId === player.socketId) {
        scene.hero = addPlayer(scene, { ...player, isHero: true });
      } else {
        addPlayer(scene, player);
      }
    }
    // tell the client we are not currently entering a door.
    // this tells the hud not to send x/y events
    scene.hero.state.isEnteringDoor = false;
    /* Add map npcs */
    for (const npc of npcs) {
      if (getNpc(scene, npc.id)) continue;
      addNpc(scene, npc);
    }
    /* Add map loot */
    for (const loot of loots) {
      if (loot?.expiredSince) continue;
      if (getLoot(scene, loot.id)) continue;
      addLoot(scene, loot);
    }
    const { collideLayer } = changeMap(scene, scene.hero.roomName);
    initPlayerCollision(scene, scene.hero, [collideLayer]);
    initCamera(scene, scene.hero);
  });

  socket.on("playerJoin", (user, { lastTeleport, isRespawn }: any = {}) => {
    const player = getPlayer(scene, user.socketId);
    if (player) {
      /* TODO: Maybe update the entire player here too */
      player.state.lastTeleport = lastTeleport;
      // manually update coords so the player won't flicker in place before respawning
      player.x = user.x;
      player.y = user.y;
      if (isRespawn) {
        player?.respawn();
      }
    } else {
      addPlayer(scene, user);
    }
  });

  socket.on("playerUpdate", (userData) => {
    const player = getPlayer(scene, userData.socketId);
    player.updateData(userData);
    player.updateExtas();
  });

  socket.on("buffUpdate", ({ npcs = [], players = [] } = {}) => {
    for (const p of players) {
      const player = getPlayer(scene, p.id);
      if (!player) continue;
      player.updateBuffData(p);
      player.updateExtas();
    }
    for (const n of npcs) {
      const npc = getNpc(scene, n.id);
      if (!npc) continue;
      npc.updateBuffData(n);
      npc.updateExtas();
    }
  });

  socket.on("lootGrabbed", ({ socketId, loot, player: userData }) => {
    const lootId = loot?.id;
    const player = getPlayer(scene, socketId);
    getLoot(scene, lootId)?.destroy(true);
    if (player?.isHero) {
      playAudio({ scene, audioKey: "item-leather", caster: player });
    }
    player.updateData(userData);
  });

  socket.on("playerAttack", ({ socketId, count, castAngle, direction, abilitySlot }) => {
    const p = getPlayer(scene, socketId);
    p.doAttack({ count, castAngle, direction, abilitySlot });
  });

  socket.on("playerCastSpell", ({ socketId, abilitySlot, castAngle }) => {
    const p = getPlayer(scene, socketId);
    p?.doCast?.({
      abilitySlot,
      castAngle,
    });
  });

  socket.on("npcAttack", ({ id, count, direction, castAngle }) => {
    const n = getNpc(scene, id);
    n.state.lastAngle = castAngle;
    n.doAttack({ count, direction, castAngle });
  });

  socket.on("npcCastSpell", ({ id, abilitySlot, castAngle }) => {
    const n = getNpc(scene, id);
    n?.doCast?.({
      abilitySlot,
      castAngle,
    });
  });

  socket.on("modifyPlayerStat", ({ amount, type, socketId }: any = {}) => {
    const p = getPlayer(scene, socketId);
    p.takeHit({ type, amount });
  });

  socket.on("assignDamage", (hitList = []) => {
    for (const hit of hitList) {
      getNpc(scene, hit?.to)?.takeHit?.(hit);
      getPlayer(scene, hit?.to)?.takeHit?.(hit);
    }
  });

  socket.on("respawnNpc", ({ id, x, y, respawnTime }) => {
    const npc = getNpc(scene, id);
    //interpolation will ignore snapshots prior. (Won't fly across screen)
    npc.state.lastTeleport = respawnTime;
    npc.setPosition(x, y);
    npc?.respawn();
  });

  socket.on("lootSpawned", ({ loot, npcId }) => {
    /*  We will fake the loot pos when an enemy dies by overriding xy */
    const n = getNpc(scene, npcId);
    if (n) {
      loot.x = n.x;
      loot.y = n.y;
    }
    addLoot(scene, loot);
  });

  socket.on("remove", (socketId) => removePlayer(scene, socketId));

  socket.on("updateUserSetting", ({ name, value }) => {
    scene.userSettings[name] = value;
    if (name === "showMinimap") {
      scene.toggleMinimap(value);
    }
    if (name === "playMusic") {
      scene.toggleMusic(value);
    }
    if (name === "charLevels") {
      scene.toggleCharLevels();
    }
  });
}
