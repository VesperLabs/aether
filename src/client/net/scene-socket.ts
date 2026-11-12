import { DEFAULT_USER_SETTINGS, type UserSettings } from "@/rules/world";
import {
  decodeRoomPoses,
  decodeTickVitals,
  type CharacterStatus,
  type FullCharacterWire,
} from "@/network/sync";
import { hideWorld, revealWorldWhenSettled } from "@/client/scenes/world-reveal";
import { enterRoom, whenRoomLoaded } from "@/client/scenes/enter-room";
import { changeSeason } from "@/client/scenes/map-season";
import { setDayClock } from "@/client/scenes/world-clock";
import { LOGIN_FADE_MS } from "@/client/scenes/login-fade";
import type { ServerToClientEvents } from "@/network";
import { onRoomObserved, startObserverTour, stopObserverTour } from "@/client/scenes/observer-tour";
import { netInterp } from "@/client/net/scene-interpolation";
import { recordPoseArrival } from "@/client/net/net-stats";
import { idOfNetId } from "@/client/net/net-ids";
import { correctHeroPosition } from "@/client/net/position-correction";
import { playAudio } from "@/client/audio/play-audio";
import { playCritShake, playHitImpact } from "@/client/views/hit-impact";
import { playDrainRing } from "@/client/views/drain-ring";
import type { DrainResource } from "@/rules/combat";
import { beginCast, endCast, landCast } from "@/client/views/player-actions";
import { playWindupPie, stopWindupPie } from "@/client/views/windup-pie";
import { drawHitShapes } from "@/client/views/hit-shapes";
import { playSpawnDissolve } from "@/client/views/dissolve";
import {
  addPlayer,
  getPlayer,
  removePlayer,
  getNpc,
  addNpc,
  addLoot,
  getLoot,
} from "@/client/scenes/scene-entities";
import type { SceneMain } from "@/client/scenes/main-scene";
import { endEffect, startEffect } from "./effects";
import { initCamera, initPlayerCollision } from "@/client/scenes/main-map";

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

  socket.on("connect", () => startObserverTour(scene));
  if (socket.connected) startObserverTour(scene);
  socket.on("roomObserved", (state) => onRoomObserved(scene, state));

  socket.on("poses", (data) => {
    const now = performance.now();
    recordPoseArrival(now);
    netInterp.add(decodeRoomPoses(data, idOfNetId), now);
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

  socket.on("seasonChanged", (season) => changeSeason(scene, season));
  socket.on("hourSet", setDayClock);

  socket.on("lootExpired", (id) => getLoot(scene, id)?.destroy());

  socket.on("partyUpdate", ({ party }) => {
    if (scene.hero) scene.hero.party = party;
  });

  /* The first room may still be loading its art (boot loads none); every later one is there */
  const initHero: ServerToClientEvents["heroInit"] = (args, meta) => {
    const roomName = args?.players?.find((p) => p.socketId === args.socketId)?.roomName as string;
    whenRoomLoaded(scene, roomName, () => buildHeroRoom(args, meta));
  };

  const buildHeroRoom: ServerToClientEvents["heroInit"] = (args, { isRespawn, isLogin } = {}) => {
    const {
      socketId,
      players = [],
      npcs = [],
      loots = [],
      effects = [],
      season,
      hour,
    } = args ?? {};
    if (args && Object.prototype.hasOwnProperty.call(args, "userSettings")) {
      scene.userSettings = { ...DEFAULT_USER_SETTINGS, ...args.userSettings };
    }
    if (isLogin) {
      stopObserverTour(scene);
      hideWorld(scene);
    }
    const roomName = players.find((p) => p.socketId === socketId)?.roomName as string;
    const { collideLayer } = enterRoom(
      scene,
      roomName,
      { players, npcs, loots, effects, season, hour },
      socketId,
    );
    const { hero } = scene;
    if (!hero) return;
    // tell the client we are not currently entering a door.
    // this tells the hud not to send x/y events
    hero.state.isEnteringDoor = false;
    initPlayerCollision(scene, hero, [collideLayer]);
    initCamera(scene, hero);
    if (isRespawn) playSpawnDissolve(hero);
    if (isLogin) revealWorldWhenSettled(scene);
  };

  /* Who came and went since the login snapshot, while the cover closed */
  interface LoginFade {
    left: string[];
    joined: FullCharacterWire[];
  }
  let loginFade: LoginFade | null = null;
  socket.on("remove", (id) => loginFade?.left.push(id));
  socket.on("playerJoin", (user) => loginFade?.joined.push(user));

  /* The login cover closes over the observed world first, so the swap is never seen.
  Not scene.time: that fires mid-step, and the swap destroys sprites still due their update. */
  const initHeroAfterFade: ServerToClientEvents["heroInit"] = (args, meta) => {
    const fade: LoginFade = { left: [], joined: [] };
    loginFade = fade;
    setTimeout(() => {
      loginFade = null;
      initHero(args, meta);
      for (const user of fade.joined) {
        if (!getPlayer(scene, user.socketId)) addPlayer(scene, user);
      }
      for (const id of fade.left) removePlayer(scene, id);
    }, LOGIN_FADE_MS);
  };

  socket.on("heroInit", (args, meta) => {
    if (meta?.isLogin) initHeroAfterFade(args, meta);
    else initHero(args, meta);
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

  socket.on("playerCastStarted", ({ socketId, castMs }) => {
    const p = getPlayer(scene, socketId);
    if (p) beginCast(p, castMs);
  });

  socket.on("playerCastCancelled", ({ socketId }) => {
    const p = getPlayer(scene, socketId);
    if (!p) return;
    endCast(p);
    if (p.isHero) window.dispatchEvent(new CustomEvent("HERO_CAST_ENDED"));
  });

  socket.on("playerCastLanded", ({ socketId, abilitySlot, castAngle }) => {
    const p = getPlayer(scene, socketId);
    if (!p) return;
    landCast(p, { abilitySlot, castAngle });
    if (p.isHero) window.dispatchEvent(new CustomEvent("HERO_CAST_ENDED", { detail: abilitySlot }));
  });

  socket.on("effectStarted", (effect) => startEffect(scene, effect));
  socket.on("effectEnded", endEffect);

  socket.on("npcAttack", ({ id, count, direction, castAngle }) => {
    const n = getNpc(scene, id);
    if (!n) return;
    n.state.lastAngle = castAngle as number;
    n.doAttack({ count: count as number, direction, castAngle });
  });

  socket.on("spellHitShapes", ({ spell, victim }) => {
    /* Only with this client's own debug view on: the server's DEBUG setting can differ */
    if (scene.physics.world.drawDebug) drawHitShapes(scene, spell, victim);
  });

  socket.on("npcWindup", ({ id, kind, windupMs }) => {
    const n = getNpc(scene, id);
    if (n) playWindupPie(n, windupMs, kind);
  });

  socket.on("npcWindupCancelled", ({ id }) => {
    const n = getNpc(scene, id);
    if (n) stopWindupPie(n);
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
      victim?.takeHit?.(hit, true, attacker);
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

  /* Spawned, tamed, or a companion following its owner in: it dissolves in */
  socket.on("npcJoin", (npc) => {
    if (!getNpc(scene, npc.id)) playSpawnDissolve(addNpc(scene, npc));
  });

  socket.on("npcRemove", (id) => getNpc(scene, id)?.destroy());

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
    const name = setting.name as keyof UserSettings;
    const value = setting.value as never;
    scene.userSettings[name] = value;
    if (name === "musicVolume") {
      scene.setMusicVolume(value);
    }
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
