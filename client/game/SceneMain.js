import Phaser from "phaser";
import Door from "../../shared/Door";
import Sign from "../../shared/Sign";
import { getMapByName } from "../../shared/Maps";
import { DEFAULT_USER_SETTINGS, distanceTo, isMobile, MINI_MAP_SIZE } from "../../shared/utils";
import { SnapshotInterpolation } from "@geckos.io/snapshot-interpolation";
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
const SI = new SnapshotInterpolation(process.env.SERVER_FPS); // the server's fps is 15
const { RectangleToRectangle } = Phaser.Geom.Intersects;

class SceneMain extends Phaser.Scene {
  constructor(socket) {
    super({ key: "SceneMain" });
    this.socket = socket;
    this.lastUpdateTime = 0;
    this.userSettings = DEFAULT_USER_SETTINGS;
    this.nearbyPeerIds = [];
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
      SI.snapshot.add(snapshot);
      for (const loot of scene?.loots?.getChildren()) {
        if (snapshot?.state?.loots?.find((l) => l?.id === loot?.id && l?.expiredSince)) {
          loot.destroy(true);
        }
      }
      for (const s of snapshot?.state?.npcs) {
        const npc = getNpc(scene, s.id);
        npc.updateState(s?.state);
        npc.doRegen();
      }
      for (const s of snapshot?.state?.players) {
        const player = getPlayer(scene, s.id);
        player.updateState(s?.state);
        player.doRegen();
      }
    });

    socket.on("partyUpdate", ({ party }) => {
      scene.hero.party = party;
    });

    socket.on("heroInit", (args) => {
      const { socketId, players = [], npcs = [], loots = [], userSettings = {} } = args ?? {};
      /* Delete everything in the scene */
      resetEntities(scene);
      /* Add players that don't exist */
      for (const player of players) {
        if (getPlayer(scene, player.socketId)) continue;
        if (socketId === player.socketId) {
          scene.hero = addPlayer(scene, { ...player, isHero: true });
          this.userSettings = { ...this.userSettings, ...userSettings };
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

    socket.on("playerAttack", ({ socketId, count, castAngle, direction }) => {
      const p = getPlayer(scene, socketId);
      p.doAttack({ count, castAngle, direction });
    });

    socket.on("playerCastSpell", ({ socketId, ilvl, base, castAngle }) => {
      const p = getPlayer(scene, socketId);
      p?.castSpell?.({
        ilvl: ilvl,
        spellName: base,
        castAngle,
      });
    });

    socket.on("npcAttack", ({ id, count, direction, castAngle }) => {
      const n = getNpc(scene, id);
      n.state.lastAngle = castAngle;
      n.doAttack({ count, direction, castAngle });
    });

    socket.on("npcCastSpell", ({ id, ilvl, base, castAngle }) => {
      const n = getNpc(scene, id);
      n?.castSpell?.({
        ilvl: ilvl,
        spellName: base,
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
    scene.load.audio(track, [track]);
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
    const playerSnapshot = SI.calcInterpolation("x y", "players");
    const npcSnapshot = SI.calcInterpolation("x y", "npcs");

    if (!this.socket || !this?.hero?.body || !playerSnapshot) return;
    /* Update Player x and y */
    for (const s of playerSnapshot?.state) {
      const player = getPlayer(this, s.socketId);
      if (!player || player?.state?.isDead) continue;
      if (!player.isHero) {
        if (s?.roomName !== this?.roomName) continue;
        /* Don't interpolate players who are respawning */
        const latestSnap = SI.vault.getById(playerSnapshot?.older);
        const newestSnap = SI.vault.getById(playerSnapshot?.newer);
        if (player?.state?.lastTeleport >= latestSnap?.time) continue;
        if (player?.state?.lastTeleport >= newestSnap?.time) continue;
        /* Update other player movements */
        player.setPosition(s.x, s.y);
        player.direction = s?.direction;
        player.vx = s.vx;
        player.vy = s.vy;
      }
    }

    enableDoors(this);
    checkEntityProximity(this, time);
    checkPlayerProximity(this, time);

    if (!npcSnapshot) return;
    /* Update NPC x and y */
    for (const s of npcSnapshot?.state) {
      const npc = getNpc(this, s.id);
      if (!npc || npc?.state?.isDead) continue;
      /* Don't interpolate npcs who are respawning */
      const latestSnap = SI.vault.getById(npcSnapshot?.older);
      const newestSnap = SI.vault.getById(npcSnapshot?.newer);
      if (s?.roomName !== this?.roomName) continue;
      if (npc?.state?.lastTeleport >= latestSnap?.time) continue;
      if (npc?.state?.lastTeleport >= newestSnap?.time) continue;
      npc.setPosition(s.x, s.y);
      npc.direction = s?.direction;
      npc.vx = s.vx;
      npc.vy = s.vy;
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

function getClosestEntity({ scene, hero, entities }) {
  let closestEntity;
  let closestDistance = 80;

  const pointer = scene.input.activePointer;
  const cursorPoint = pointer.positionToCamera(scene.cameras.main);

  for (const entity of entities) {
    const cursorDistance = distanceTo(entity, cursorPoint);

    if (entity.state && !isMobile) {
      entity.state.isHovering =
        cursorDistance < (entity?.hitBoxSize?.width + entity?.hitBoxSize?.height) / 2;
    }

    const distance = distanceTo(entity, hero);
    if (["sign", "keeper"]?.includes(entity?.kind)) {
      if (distance < closestDistance) {
        closestEntity = entity;
        closestDistance = distance;
      }
    } else {
      entity.checkStealth({ distance });
    }
  }
  return closestEntity;
}

// Modify to return all nearby players
function getNearbyPlayers(hero, players) {
  let nearbyPlayers = [];
  for (const player of players) {
    const distance = distanceTo(player, hero);
    // adjust player stealth
    player.checkStealth({ distance });
    // do not need to do anything else for hero
    if (player.isHero) continue;
    if (distance < 200) {
      nearbyPlayers.push(player);
    }
  }
  return nearbyPlayers; // returns a list of player objects
}

function checkPlayerProximity(scene, time) {
  if (time % 6 > 1) return;
  const { hero } = scene ?? {};

  if (!hero || hero.state.isDead) return;

  const players = scene.players.getChildren();

  // Get the list of nearby players
  const nearbyPlayers = getNearbyPlayers(hero, players);
  const nearbyPeerIds = nearbyPlayers.map((player) => player.peerId);

  // Identify players that have newly entered the hero's proximity
  for (const peerId of nearbyPeerIds) {
    if (!scene.nearbyPeerIds.includes(peerId)) {
      console.log("NEAR");
      window.dispatchEvent(new CustomEvent("HERO_NEAR_PLAYER", { detail: { peerId } }));
    }
  }

  // Identify players that have left the hero's proximity
  for (const peerId of scene.nearbyPeerIds) {
    if (!nearbyPeerIds.includes(peerId)) {
      console.log("FAR");
      window.dispatchEvent(new CustomEvent("HERO_AWAY_PLAYER", { detail: { peerId } }));
    }
  }

  // Update the hero's state to the new list of nearby players
  scene.nearbyPeerIds = nearbyPeerIds;
}

function checkEntityProximity(scene, time) {
  if (time % 11 > 1) return;
  const { hero } = scene ?? {};

  if (!hero || hero.state.isDead) return;

  const entities = [...scene.npcs.getChildren(), ...scene.signs.getChildren()];
  const closestEntity = getClosestEntity({ scene, hero, entities });

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
