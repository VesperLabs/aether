import Phaser from "phaser";
import Door from "../../shared/Door";
import Sign from "../../shared/Sign";
import { getMapByName } from "../../shared/Maps";
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
  distanceTo,
  MUSIC_VOLUME,
  playAudio,
  getGameZoomLevel,
} from "../utils";
const SI = new SnapshotInterpolation(process.env.SERVER_FPS); // the server's fps is 15
const { RectangleToRectangle } = Phaser.Geom.Intersects;

class SceneMain extends Phaser.Scene {
  constructor(socket) {
    super({ key: "SceneMain" });
    this.socket = socket;
    this.lastUpdateTime = 0;
  }

  create() {
    const scene = this;
    const socket = scene?.socket;

    socket.on("update", (snapshot) => {
      if (!snapshot?.state) return;
      SI.snapshot.add(snapshot);
      for (const loot of scene?.loots?.getChildren()) {
        if (!snapshot?.state?.loots?.some((l) => l?.id === loot?.id)) {
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

    socket.on("heroInit", ({ socketId, players = [], npcs = [], loots = [] }) => {
      /* Delete everything in the scene */
      resetEntities(scene);
      /* Add players that don't exist */
      for (const player of players) {
        if (getPlayer(scene, player.socketId)) continue;
        if (socketId === player.socketId) {
          scene.hero = addPlayer(scene, { ...player, isHero: true });
        } else {
          addPlayer(scene, player);
        }
      }
      /* Add map npcs */
      for (const npc of npcs) {
        if (getNpc(scene, npc.id)) continue;
        addNpc(scene, npc);
      }
      /* Add map loot */
      for (const loot of loots) {
        if (getLoot(scene, loot.id)) continue;
        addLoot(scene, loot);
      }
      const { collideLayer } = changeMap(scene, scene.hero.roomName);
      setPlayerCollision(scene, scene.hero, [collideLayer]);
      setCamera(scene, scene.hero);
    });

    socket.on("playerJoin", (user, { lastTeleport, isRespawn } = {}) => {
      const player = getPlayer(scene, user.socketId);
      if (player) {
        /* TODO: Maybe update the entire player here too */
        player.state.lastTeleport = lastTeleport;
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

    socket.on("lootGrabbed", ({ socketId, lootId, player: userData }) => {
      const player = getPlayer(scene, socketId);
      const loot = getLoot(scene, lootId);
      loot?.destroy(true);
      if (player?.isHero) {
        playAudio({ scene, audioKey: "item-leather", caster: player });
      }
      player.updateData(userData);
    });

    socket.on("playerAttack", ({ socketId, count }) => {
      const p = getPlayer(scene, socketId);
      p.doAttack(count);
    });

    socket.on("playerCastSpell", ({ socketId, ilvl, base, castAngle }) => {
      const p = getPlayer(scene, socketId);
      p?.castSpell?.({
        ilvl: ilvl,
        spellName: base,
        castAngle,
      });
    });

    socket.on("npcAttack", ({ id, count, direction }) => {
      const n = getNpc(scene, id);
      n.direction = direction;
      n.doAttack(count);
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

    /* We already recieve direction from other players */
    socket.on("changeDirection", ({ socketId, direction }) => {
      const p = getPlayer(scene, socketId);
      if (p?.isHero) {
        p.direction = direction;
      }
    });

    socket.on("assignDamage", (hitList = []) => {
      for (const hit of hitList) {
        getNpc(scene, hit?.to)?.takeHit?.(hit);
        getPlayer(scene, hit?.to)?.takeHit?.(hit);
      }
    });

    socket.on("respawnPlayer", (id) => {
      getPlayer(scene, id)?.respawn();
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

    // Add event listener for window resize
    this.scale.on(
      "resize",
      () => {
        setCamera(scene, scene.hero);
      },
      this
    );
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
        /* Don't interpolate users who are going through a door */
        const latestSnap = SI.vault.getById(playerSnapshot?.older);
        const newestSnap = SI.vault.getById(npcSnapshot?.newer);
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

    if (!npcSnapshot) return;
    /* Update NPC x and y */
    for (const s of npcSnapshot?.state) {
      const npc = getNpc(this, s.id);
      if (!npc || npc?.state?.isDead) continue;
      /* Don't interpolate npcs who are respawning */
      const latestSnap = SI.vault.getById(npcSnapshot?.older);
      const newestSnap = SI.vault.getById(npcSnapshot?.newer);
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
      console.log("yo");
      window.dispatchEvent(
        new CustomEvent("UPDATE_ROOM_PLAYERS", {
          detail: { players: this?.players?.getChildren?.() },
        })
      );
      this.lastUpdateTime = time;
    }
  }
}

function checkEntityProximity(scene, time) {
  if (time % 4 > 1) return;
  const { hero } = scene ?? {};
  let coords = {};
  let closestEntity;
  let closestDistance = Infinity;

  hero?.body?.getBounds(coords);

  // Add extra pixels to the hero's bounds
  const extraPixels = 10; // Adjust this value to add the desired number of extra pixels
  coords.x -= extraPixels;
  coords.y -= extraPixels;
  coords.width += extraPixels * 2;
  coords.height += extraPixels * 2;

  const npcs = scene.npcs.getChildren();
  const signs = scene.signs.getChildren();

  /* Loop through entities, if hero is intersecting, find npc wth closest distance to hero */
  for (const entity of [...npcs, ...signs]) {
    if (!["keeper", "sign"].includes(entity?.kind)) continue;
    if (RectangleToRectangle(coords, entity.getBounds())) {
      const distance = distanceTo(entity, hero);
      if (distance < closestDistance) {
        closestEntity = entity;
        closestDistance = distance;
      }
    }
  }

  /* Update the hero to be targeting them */
  if (closestEntity && !hero.state.isDead) {
    if (hero.state.targetNpcId !== closestEntity?.id && !closestEntity?.state?.lockedPlayerId) {
      hero.state.targetNpcId = closestEntity?.id;
      window.dispatchEvent(new CustomEvent("HERO_NEAR_NPC", { detail: closestEntity?.id }));
    }
  } else {
    if (hero.state.targetNpcId) {
      hero.state.targetNpcId = null;
      window.dispatchEvent(new CustomEvent("HERO_NEAR_NPC", { detail: null }));
    }
  }
}

function enableDoors(scene) {
  let coords = {};
  scene?.hero?.body?.getBounds(coords);
  for (const door of scene.doors.getChildren()) {
    if (!RectangleToRectangle(coords, door.getBounds())) door.isEnabled = true;
  }
}

function setCamera(scene, hero) {
  if (!hero || !scene?.map) return;
  const zoomLevel = getGameZoomLevel(scene);

  scene.cameras.main.setZoom(zoomLevel);
  scene.cameras.main.startFollow(hero, true, 1, 1, 0, hero.bodyOffsetY);
  scene.cameras.main.setBounds(0, 0, scene.map.widthInPixels, scene.map.heightInPixels);
}

function setPlayerCollision(scene, player, colliders = []) {
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

function changeMusic(scene, roomName) {
  const track = getMapByName(roomName)?.music;
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

function changeMap(scene, roomName) {
  changeMusic(scene, roomName);
  const tileSetKey = roomName?.split("-")?.[0];

  scene.map = scene.make.tilemap({
    key: roomName,
  });

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