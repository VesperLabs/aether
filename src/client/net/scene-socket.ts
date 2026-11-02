import { DEFAULT_USER_SETTINGS, type UserSettings } from "@/rules/world";
import {
  decodeRoomPoses,
  decodeTickVitals,
  type CharacterStatus,
  type FullCharacterWire,
} from "@/network/sync";
import { netInterp } from "@/client/net/scene-interpolation";
import { idOfNetId } from "@/client/net/net-ids";
import { correctHeroPosition } from "@/client/net/position-correction";
import { playAudio } from "@/client/audio/play-audio";
import { playCritShake, playHitImpact } from "@/client/views/hit-impact";
import { playDrainRing } from "@/client/views/drain-ring";
import type { DrainResource } from "@/rules/combat";
import { playWindupRing } from "@/client/views/windup-ring";
import { drawHitShapes } from "@/client/views/hit-shapes";
import { playSpawnDissolve } from "@/client/views/dissolve";
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
import type { SceneMain } from "@/client/scenes/main-scene";
import { changeMap, initCamera, initPlayerCollision } from "@/client/scenes/main-map";

/** What a tick's vitals update on a player or npc sprite. */
interface VitalsHolder {
  stats?: Record<string, unknown> | null;
  isHero?: boolean;
  updateHpBar(): void;
}

/** What a status updates on a player or npc sprite. */
interface StatusHolder extends VitalsHolder {
  updateState(state: Record<string, unknown>): void;
  doRegen(): void;
}

/**
 * Takes the server's hp, mp and sp from a tick. Regen and hit effects still play from their own
 * messages; this keeps the numbers right however many of those were missed or merged.
 */
function applyTickVitals(character: VitalsHolder, v: unknown) {
  const vitals = decodeTickVitals(v);
  const stats = character.stats;
  if (!vitals || !stats) return;
  const keys = Object.keys(vitals) as (keyof typeof vitals)[];
  if (keys.every((key) => stats[key] === vitals[key])) return;
  Object.assign(stats, vitals);
  character.updateHpBar();
  if (character.isHero) window.dispatchEvent(new Event("UPDATE_HUD"));
}

/** Registers every server message the main scene reacts to. */
export function bindSceneSocket(scene: SceneMain) {
  const socket = scene.socket;

  socket.on("poses", (data) => {
    netInterp.add(decodeRoomPoses(data, idOfNetId), performance.now());
  });

  socket.on("statuses", ({ p = [], n = [] }) => {
    const apply = (character: StatusHolder | undefined | null, s: CharacterStatus) => {
      if (!character) return;
      character.updateState(s.state);
      character.doRegen();
      applyTickVitals(character, s.v);
    };
    for (const s of n) apply(getNpc(scene, s.id), s);
    for (const s of p) apply(getPlayer(scene, s.id), s);
  });

  socket.on("lootExpired", (id) => getLoot(scene, id)?.destroy());

  socket.on("partyUpdate", ({ party }) => {
    if (scene.hero) scene.hero.party = party;
  });

  socket.on("heroInit", (args, { isRespawn } = {}) => {
    const { socketId, players = [], npcs = [], loots = [] } = args ?? {};
    if (args && Object.prototype.hasOwnProperty.call(args, "userSettings")) {
      scene.userSettings = { ...DEFAULT_USER_SETTINGS, ...args.userSettings };
    }
    /* Delete everything in the scene */
    resetEntities(scene);
    netInterp.reset();
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
    if (isRespawn) playSpawnDissolve(scene.hero);
  });

  socket.on("playerJoin", (user, { lastTeleport, isRespawn } = {}) => {
    const player = getPlayer(scene, user.socketId);
    if (player) {
      /* TODO: Maybe update the entire player here too */
      player.state.lastTeleport = lastTeleport as number;
      // manually update coords so the player won't flicker in place before respawning
      player.x = user.x;
      player.y = user.y;
      if (isRespawn) {
        player?.respawn();
        playSpawnDissolve(player);
      }
    } else {
      addPlayer(scene, user);
    }
  });

  /* The server rejected our position (too fast, or inside a wall): go back to its position. */
  socket.on("positionCorrection", ({ x, y }) => {
    if (scene.hero?.body) correctHeroPosition(scene.hero, x, y);
  });

  socket.on("playerUpdate", (userData) => {
    const player = getPlayer(scene, userData.socketId);
    if (!player) return;
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
    const lootItem = getLoot(scene, lootId);
    const snapshot = player?.isHero ? lootItem?.screenSnapshot() : undefined;
    if (snapshot) window.dispatchEvent(new CustomEvent("LOOT_FLY", { detail: snapshot }));
    lootItem?.destroy();
    if (player?.isHero) {
      playAudio({ scene, audioKey: "item-leather", caster: player });
    }
    player?.updateData(userData as FullCharacterWire);
  });

  socket.on("playerAttack", ({ socketId, count, castAngle, direction, abilitySlot }) => {
    const p = getPlayer(scene, socketId);
    p?.doAttack({
      count: count as number,
      castAngle: castAngle ?? undefined,
      direction: direction ?? undefined,
      abilitySlot: abilitySlot ?? undefined,
    });
  });

  socket.on("knockedBack", ({ angle }) => {
    const hero = scene.hero;
    if (!hero || hero.state.isDead) return;
    hero.state.knockbackAt = Date.now();
    hero.state.knockbackAngle = angle;
  });

  socket.on("playerDodge", ({ socketId, angle }) => {
    const p = getPlayer(scene, socketId);
    if (!p || p.isHero) return;
    p.state.lastDodge = Date.now();
    p.state.dodgeAngle = angle;
  });

  socket.on("playerCastSpell", ({ socketId, abilitySlot, castAngle }) => {
    const p = getPlayer(scene, socketId);
    p?.doCast?.({
      abilitySlot: abilitySlot ?? undefined,
      castAngle: castAngle ?? undefined,
    });
  });

  socket.on("npcAttack", ({ id, count, direction, castAngle }) => {
    const n = getNpc(scene, id);
    if (!n) return;
    n.state.lastAngle = castAngle as number;
    n.doAttack({ count: count as number, direction, castAngle });
  });

  socket.on("spellHitShapes", ({ spell, victim }) => drawHitShapes(scene, spell, victim));

  socket.on("npcWindup", ({ id, kind, windupMs }) => {
    const n = getNpc(scene, id);
    if (n) playWindupRing(n, windupMs, kind);
  });

  socket.on("npcCastSpell", ({ id, abilitySlot, castAngle }) => {
    const n = getNpc(scene, id);
    n?.doCast?.({
      abilitySlot,
      castAngle,
    });
  });

  socket.on("modifyPlayerStat", ({ amount, type, socketId }) => {
    const p = getPlayer(scene, socketId);
    p?.takeHit({ type, amount });
  });

  socket.on("assignDamage", (hitList = []) => {
    for (const hit of hitList) {
      const victim = getNpc(scene, hit?.to) ?? getPlayer(scene, hit?.to);
      const attacker = getNpc(scene, hit?.from) ?? getPlayer(scene, hit?.from);
      playHitImpact(victim, attacker, hit);
      playCritShake(victim, attacker, hit, !!scene.userSettings.screenShake);
      /* A drain pulses a ring on the one who drank it (`to`) */
      if (hit?.isDrain) playDrainRing(victim, hit.type as DrainResource);
      victim?.takeHit?.(hit);
    }
  });

  socket.on("respawnNpc", ({ id, x, y, respawnTime }) => {
    const npc = getNpc(scene, id);
    if (!npc) return;
    //interpolation will ignore snapshots prior. (Won't fly across screen)
    npc.state.lastTeleport = respawnTime;
    npc.setPosition(x, y);
    npc?.respawn();
    playSpawnDissolve(npc);
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

  socket.on("updateUserSetting", (setting) => {
    // Every user setting is an on/off switch.
    const name = setting.name as keyof UserSettings;
    const value = setting.value as boolean;
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
