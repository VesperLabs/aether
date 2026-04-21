import Phaser from "phaser";
import Door from "../../shared/Door";
import Sign from "../../shared/Sign";
import { getMapByName } from "../../shared/Maps";
import { DEFAULT_USER_SETTINGS, distanceTo, isMobile, MINI_MAP_SIZE } from "../../shared/utils";
import {
  DEFAULT_SERVER_FPS,
  EXTRA_INTERPOLATION_BUFFER_MS,
  INTERPOLATION_BUFFER_TICKS,
} from "../../shared/constants";
import { decodeWireDirection } from "../../shared/netWire";
import { expandTickState } from "../../shared/wireTick";
import { heroInitToTickExpanded } from "../../shared/tickDelta";
import { createNetInterpolator } from "./netInterpolation";

const ASSETS_BASE = process.env.ASSETS_URL || "";
const assetUrl = (src) =>
  ASSETS_BASE ? src.replace(/^\.\/assets\//, ASSETS_BASE + "/") : src;
import {
  addPlayer,
  getPlayer,
  resetEntities,
  removePlayer,
  getNpc,
  addNpc,
  addLoot,
  getLoot,
  playAudio,
  getGameZoomLevel,
  changeMusic,
  MUSIC_VOLUME,
} from "../utils";
const serverTickHz = (() => {
  const n = Number(process.env.SERVER_FPS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SERVER_FPS;
})();
const netInterp = createNetInterpolator({
  serverFps: serverTickHz,
  bufferTicks: INTERPOLATION_BUFFER_TICKS,
  extraBufferMs: EXTRA_INTERPOLATION_BUFFER_MS,
});
const { RectangleToRectangle } = Phaser.Geom.Intersects;

class SceneMain extends Phaser.Scene {
  constructor(socket) {
    super({ key: "SceneMain" });
    this.socket = socket;
    this.lastUpdateTime = 0;
    this.userSettings = DEFAULT_USER_SETTINGS;
    /** @type {Array<{ socketId: string, peerId?: string | null }>} */
    this.nearbyRemotePlayers = [];
  }

  create() {
    const scene = this;
    const socket = scene?.socket;

    //create minimap
    if (!isMobile) {
      scene.minimap = scene.cameras.add(0, 0, MINI_MAP_SIZE, MINI_MAP_SIZE);
    }

    socket.on("update", (snapshot) => {
      if (!snapshot?.state) return;
      const expanded = { ...snapshot, state: expandTickState(snapshot.state) };
      netInterp.addSnapshot(expanded);
      for (const loot of scene?.loots?.getChildren()) {
        if (expanded?.state?.loots?.find((l) => l?.id === loot?.id && l?.expiredSince)) {
          loot.destroy(true);
        }
      }
      for (const s of expanded?.state?.npcs) {
        const npc = getNpc(scene, s.id);
        npc.updateState(s?.state);
        npc.doRegen();
      }
      for (const s of expanded?.state?.players) {
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
        this.userSettings = { ...DEFAULT_USER_SETTINGS, ...args.userSettings };
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

    socket.on("playerJoin", (user, { lastTeleport, isRespawn } = {}) => {
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

    socket.on("modifyPlayerStat", ({ amount, type, socketId } = {}) => {
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

    this.socket.on("lootSpawned", ({ loot, npcId }) => {
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
      this.userSettings[name] = value;
      if (name === "showMinimap") {
        this.toggleMinimap(value);
      }
      if (name === "playMusic") {
        this.toggleMusic(value);
      }
      if (name === "charLevels") {
        this.toggleCharLevels();
      }
    });

    const onVideoChatStreamReady = () => {
      for (const { peerId, socketId } of scene.nearbyRemotePlayers ?? []) {
        if (peerId && socketId) {
          window.dispatchEvent(
            new CustomEvent("HERO_NEAR_PLAYER", { detail: { peerId, socketId } })
          );
        }
      }
    };
    window.addEventListener("VIDEO_CHAT_STREAM_READY", onVideoChatStreamReady);
    scene.events.once("shutdown", () => {
      window.removeEventListener("VIDEO_CHAT_STREAM_READY", onVideoChatStreamReady);
    });

    // Add event listener for window resize
    this.scale.on(
      "resize",
      () => {
        initCamera(scene, scene.hero);
      },
      this
    );
  }
  // user setting functions
  toggleMusic(value) {
    return value ? this.changeMusic() : this.sound.stopAll();
  }
  toggleMinimap(value) {
    return this.minimap.setVisible(value);
  }
  toggleCharLevels() {
    const scene = this;
    [...scene.players.getChildren(), ...scene.npcs.getChildren()].forEach((a) =>
      a.updateUserName()
    );
  }
  changeMusic() {
    const scene = this;
    if (!scene.userSettings.playMusic) return; // user does not want music
    const track = getMapByName(scene?.roomName)?.music;
    if (!track) return;
    let sound = scene.sound.get(track);
    if (sound && sound.isPlaying) {
      // Sound is already playing, do nothing
      return;
    }
    scene.sound.stopAll();
    scene.load.audio(track, [assetUrl(track)]);
    scene.load.once("complete", () => {
      sound = scene.sound.get(track);
      if (!sound) {
        sound = scene.sound.add(track, { volume: MUSIC_VOLUME, loop: true });
      }
      sound.play();
    });
    scene.load.start();
  }
  update(time, delta) {
    const elapsedTime = time - this.lastUpdateTime;
    if (!this.socket || !this?.hero?.body) return;

    const playerSnapshot = netInterp.interpolateEntityList("players");
    const npcSnapshot = netInterp.interpolateEntityList("npcs");

    /* Remote players only (hero is predicted locally). Hermite + buffered server time. */
    if (playerSnapshot) {
      for (const s of playerSnapshot?.state) {
        const player = getPlayer(this, s.socketId ?? s.id);
        if (!player || player?.state?.isDead) continue;
        if (!player.isHero) {
          if (s?.roomName != null && s.roomName !== this?.roomName) continue;
          if (player?.state?.lastTeleport >= playerSnapshot.olderTime) continue;
          if (player?.state?.lastTeleport >= playerSnapshot.newerTime) continue;
          player.setPosition(s.x, s.y);
          player.direction =
            typeof s.d === "number"
              ? decodeWireDirection(s.d, player.direction)
              : s.direction ?? player.direction;
          player.vx = s.vx ?? 0;
          player.vy = s.vy ?? 0;
        }
      }
    }

    enableDoors(this);
    checkProximities(this, time);

    if (npcSnapshot) {
      for (const s of npcSnapshot?.state) {
        const npc = getNpc(this, s.id);
        if (!npc || npc?.state?.isDead) continue;
        if (s?.roomName != null && s.roomName !== this?.roomName) continue;
        if (npc?.state?.lastTeleport >= npcSnapshot.olderTime) continue;
        if (npc?.state?.lastTeleport >= npcSnapshot.newerTime) continue;
        npc.setPosition(s.x, s.y);
        npc.direction =
          typeof s.d === "number"
            ? decodeWireDirection(s.d, npc.direction)
            : s.direction ?? npc.direction;
        npc.vx = s.vx ?? 0;
        npc.vy = s.vy ?? 0;
      }
    }

    /* Send an update to the UI every 2 seconds.
    This is really only for the PARTY UI hud.
    Probably can check if the hero is in a party before we do this
    to save some resources */
    if (elapsedTime >= 1000 && this?.hero?.party) {
      window.dispatchEvent(
        new CustomEvent("UPDATE_ROOM_PLAYERS", {
          detail: { players: this?.players?.getChildren?.() },
        })
      );
      this.lastUpdateTime = time;
    }
  }
}

function triggerPlayerProximity(scene, nearbyPlayers) {
  const next = nearbyPlayers
    .map((player) => ({
      socketId: player.socketId,
      peerId: player.peerId || null,
    }))
    .filter((x) => x.socketId);

  const prev = scene.nearbyRemotePlayers || [];
  const sameSocket = (a, b) => a.socketId === b.socketId;

  for (const n of next) {
    if (!prev.some((p) => sameSocket(p, n))) {
      window.dispatchEvent(
        new CustomEvent("HERO_NEAR_PLAYER", { detail: { socketId: n.socketId, peerId: n.peerId } })
      );
    }
  }
  for (const p of prev) {
    if (!next.some((n) => sameSocket(n, p))) {
      window.dispatchEvent(
        new CustomEvent("HERO_AWAY_PLAYER", { detail: { socketId: p.socketId, peerId: p.peerId } })
      );
    }
  }
  scene.nearbyRemotePlayers = next;
}

function triggerEntityProximity(scene, closestEntity) {
  const { hero } = scene ?? {};
  if (
    closestEntity &&
    hero.state.targetNpcId !== closestEntity?.id &&
    !closestEntity?.state?.lockedPlayerId
  ) {
    hero.state.targetNpcId = closestEntity?.id;
    window.dispatchEvent(new CustomEvent("HERO_NEAR_NPC", { detail: closestEntity?.id }));
  } else if (!closestEntity && hero.state.targetNpcId) {
    hero.state.targetNpcId = null;
    window.dispatchEvent(new CustomEvent("HERO_NEAR_NPC", { detail: null }));
  }
}

function checkProximities(scene, time) {
  const { hero } = scene ?? {};
  if (time % 8 > 1) return;
  if (!hero) return;

  const entities = [
    ...scene.npcs.getChildren(),
    ...scene.signs.getChildren(),
    ...scene.players.getChildren(),
  ];

  let closestEntity;
  let closestDistance = 80;
  let PLAYER_CLOSEST_DISTANCE = 200;

  let nearbyPlayers = [];
  const pointer = scene.input.activePointer;
  const cursorPoint = pointer.positionToCamera(scene.cameras.main);

  for (const entity of entities) {
    const distance = distanceTo(entity, hero);

    if (entity.kind === "player") {
      if (distance < PLAYER_CLOSEST_DISTANCE) {
        if (!entity.isHero) nearbyPlayers.push(entity);
      }
    }

    if (["sign", "keeper"]?.includes(entity?.kind)) {
      if (distance < closestDistance) {
        closestEntity = entity;
        closestDistance = distance;
      }
    }

    if (entity.kind !== "sign") {
      entity.checkStealth({ distance });
    }

    if (["nasty", "keeper"]?.includes(entity?.kind)) {
      const cursorDistance = distanceTo(entity, cursorPoint);
      if (entity.state && !isMobile) {
        entity.state.isHovering =
          cursorDistance < (entity?.hitBoxSize?.width + entity?.hitBoxSize?.height) / 2;
      }
    }
  }

  triggerEntityProximity(scene, closestEntity);
  triggerPlayerProximity(scene, nearbyPlayers);
}

function enableDoors(scene) {
  let coords = {};
  scene?.hero?.body?.getBounds(coords);
  for (const door of scene.doors.getChildren()) {
    if (!RectangleToRectangle(coords, door.getBounds())) door.isEnabled = true;
  }
}

function initMiniMap(scene, hero) {
  if (!hero || !scene?.map || !scene.minimap) return;

  // Only show the minimap if its enabled
  scene.minimap.setVisible(scene?.userSettings?.showMinimap);
  // Calculate the x-coordinate to position the minimap on the far right
  scene.minimap.setPosition(Math.round(scene.scale.width - MINI_MAP_SIZE), 0); // Rounded to the nearest integer

  // Set the bounds of the minimap to match the map's dimensions
  scene.minimap.setBounds(0, 0, scene.map.widthInPixels, scene.map.heightInPixels);

  // Set the zoom level for the minimap (adjust as needed)
  const minimapZoomLevel = 0.25;
  scene.minimap.setZoom(minimapZoomLevel);

  // Follow the hero with the minimap camera
  scene.minimap.startFollow(hero, true, 0.5, 0.5, 0, 0);
}

function initCamera(scene, hero) {
  if (!hero || !scene?.map) return;
  const zoomLevel = getGameZoomLevel(scene);

  scene.cameras.main.setZoom(zoomLevel);
  scene.cameras.main.startFollow(hero, true, 1, 1, 0, hero.bodyOffsetY);
  scene.cameras.main.setBounds(0, 0, scene.map.widthInPixels, scene.map.heightInPixels);

  initMiniMap(scene, hero);
}

function initPlayerCollision(scene, player, colliders = []) {
  scene.physics.world.colliders.destroy();
  scene.physics.world.setBounds(0, 0, scene.map.widthInPixels, scene.map.heightInPixels);
  player.body.setCollideWorldBounds(true);
  colliders.forEach((c) => {
    scene.physics.add.collider(player, c);
  });

  scene.physics.add.overlap(
    scene.hero,
    scene.doors,
    null,
    (hero, door) => {
      /* If they spawned on the door, ignore it for now */
      const { x, y } = hero.startingCoords;
      if (door.getBounds().contains(x, y)) {
        door.heroSpawn = true;
      }
      /* If the door is not disabled let it teleport */
      if (!door.heroSpawn || door.isEnabled) {
        player.state.isEnteringDoor = true;
        door.destroy();
        /* Wait for the door to go away before emitting the event */
        setTimeout(() => {
          scene.socket.emit("enterDoor", door.name);
        }, 1);
      }
    },
    scene
  );
}

function changeMap(scene, roomName) {
  const tileSetKey = roomName?.split("-")?.[0];

  scene.roomName = roomName;
  scene.map = scene.make.tilemap({
    key: roomName,
  });
  changeMusic(scene);

  const tileSet = scene.map.addTilesetImage("tileset-" + tileSetKey);
  const tilesetShadows = scene.map.addTilesetImage("tileset-" + tileSetKey + "-shadows");
  const tilesetCollide = scene.map.addTilesetImage("tileset-collide");
  const tilesetExtras = scene.map.addTilesetImage("tileset-extras");
  const collideLayer = scene.map.createLayer("Collide", tilesetCollide).setCollisionByProperty({
    collides: true,
  });

  scene.map.createLayer("Ground", tileSet).setDepth(0);
  scene.map.createLayer("Shadows", tilesetShadows).setDepth(1);
  scene.map.createLayer("Overlay", tileSet).setDepth(2);
  scene.map.createLayer("Extras", tilesetExtras).setDepth(3);
  scene.map.createLayer("Above", tileSet).setDepth(9999);
  if (scene.animatedTiles) scene.animatedTiles.init(scene.map);

  /* Create Doors */
  const mapDoors = scene.map.getObjectLayer("Doors").objects;
  for (const door of mapDoors) {
    const newDoor = new Door(scene, door);
    scene.doors.add(newDoor);
  }
  /* Create Signs */
  if (scene.map.getObjectLayer("Signs")) {
    const mapSigns = scene.map.getObjectLayer("Signs").objects;
    for (const sign of mapSigns) {
      const newSign = new Sign(scene, sign);
      scene.signs.add(newSign);
    }
  }

  return { collideLayer };
}

export default SceneMain;
