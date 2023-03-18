import Phaser from "phaser";
import Door from "./Door";
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
  getHeroSpin,
} from "./utils";
const SI = new SnapshotInterpolation(process.env.SERVER_FPS); // the server's fps is 15

class SceneMain extends Phaser.Scene {
  constructor(socket) {
    super({ key: "SceneMain" });
    this.socket = socket;
  }

  preload() {
    this.cursorKeys = this.input.keyboard.createCursorKeys();
  }

  create() {
    const scene = this;
    const socket = scene?.socket;

    socket.on("update", (snapshot) => {
      SI.snapshot.add(snapshot);
      for (const loot of scene?.loots?.getChildren()) {
        if (!snapshot?.state?.loots?.some((l) => l?.id === loot?.id)) {
          loot.destroy(true);
        }
      }
      for (const s of snapshot?.state?.npcs) {
        const npc = getNpc(scene, s.id);
        npc.setBubbleMessage(s?.bubbleMessage);
        npc.state.doHpRegen = s.state.doHpRegen;
        npc.state.doMpRegen = s.state.doMpRegen;
        npc.doRegen();
      }
      for (const s of snapshot?.state?.players) {
        const player = getPlayer(scene, s.id);
        player.setBubbleMessage(s?.bubbleMessage);
        player.state.doHpRegen = s.state.doHpRegen;
        player.state.doMpRegen = s.state.doMpRegen;
        player.doRegen();
      }
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
      for (const npc of npcs) {
        if (getNpc(scene, npc.id)) continue;
        addNpc(scene, npc);
      }
      for (const loot of loots) {
        if (getLoot(scene, loot.id)) continue;
        addLoot(scene, loot);
      }
      const { collideLayer } = changeMap(scene, scene.hero.roomName);
      setPlayerCollision(scene, scene.hero, [collideLayer]);
      setCamera(scene, scene.hero);
    });

    socket.on("playerJoin", (user) => {
      const player = getPlayer(scene, user.socketId);
      if (player) {
        /* TODO: Maybe update the entire player here too */
        return (player.state.lastTeleport = Date.now());
      }
      addPlayer(scene, user);
    });

    socket.on("playerUpdate", (userData) => {
      const player = getPlayer(scene, userData.socketId);
      player.updateData(userData);
    });

    socket.on("playerAttack", ({ socketId, count, direction }) => {
      const p = getPlayer(scene, socketId);
      p.direction = direction;
      p.doAttack(count);
    });

    socket.on("npcAttack", ({ id, direction }) => {
      const n = getNpc(scene, id);
      n.doNpcAttack();
    });

    socket.on("changeDirection", ({ socketId, direction }) => {
      const p = getPlayer(scene, socketId);
      p.direction = direction;
    });

    socket.on("assignDamage", ({ npcHitList = [], playerHitList = [] }) => {
      for (const hit of npcHitList) {
        getNpc(scene, hit?.to)?.takeHit?.(hit);
      }
      for (const hit of playerHitList) {
        getPlayer(scene, hit?.to)?.takeHit?.(hit);
      }
    });

    socket.on("respawnNpc", (id) => {
      getNpc(scene, id)?.respawn();
    });

    this.socket.on("lootSpawned", (loot, npcId) => {
      /* TODO: We will fake the loot pos when an enemy dies by overriding xy */
      addLoot(scene, loot);
    });

    socket.on("remove", (socketId) => removePlayer(scene, socketId));

    socket.emit("login");
  }

  update(time, delta) {
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
        if (player?.state?.lastTeleport >= latestSnap?.time) continue;
        /* Update other player movements */
        player.setPosition(s.x, s.y);
        player.direction = s?.direction;
      }
      player.vx = s.vx;
      player.vy = s.vy;
    }
    /* Update NPC x and y */
    for (const s of npcSnapshot?.state) {
      const npc = getNpc(this, s.id);
      if (!npc || npc?.state?.isDead) continue;
      npc.setPosition(s.x, s.y);
      npc.direction = s?.direction;
      npc.vx = s.vx;
      npc.vy = s.vy;
    }
    moveHero(this, time);
    enableDoors(this);
  }
}

function enableDoors(scene) {
  let coords = {};
  scene?.hero?.body?.getBounds(coords);
  for (const door of scene.doors.getChildren()) {
    if (!Phaser.Geom.Intersects.RectangleToRectangle(coords, door.getBounds()))
      door.isEnabled = true;
  }
}

function moveHero(scene, time) {
  const hero = scene?.hero;
  if (hero?.state?.isDead) return;
  const speed = hero.stats.speed;
  const joystick = scene.game.scene.scenes[2].joystick;
  const left = scene.cursorKeys.left.isDown;
  const right = scene.cursorKeys.right.isDown;
  const up = scene.cursorKeys.up.isDown;
  const down = scene.cursorKeys.down.isDown;

  let vx = 0;
  let vy = 0;

  if (left) {
    vx = -speed;
    hero.direction = "left";
  }
  if (right) {
    vx = speed;
    hero.direction = "right";
  }
  if (up) {
    vy = -speed;
    hero.direction = "up";
  }
  if (down) {
    vy = speed;
    hero.direction = "down";
  }
  if (left && right) vx = 0;
  if (up && down) vy = 0;
  if (!left && !right && !up && !down) {
    vx = 0;
    vy = 0;
  }

  if (joystick.deltaX || joystick.deltaY) {
    vx = joystick.deltaX * speed;
    vy = joystick.deltaY * speed;
    hero.direction = getHeroSpin(hero, { x: hero.x + vx, y: hero.y + vy });
  }

  if (hero.state.isAttacking) {
    vx = 0;
    vy = 0;
  }

  hero.body.setVelocity(vx, vy);

  /* If the hero is standing still do not update the server */
  if (!hero.state.isIdle) {
    //if (time % 2 > 1)
    scene.socket.emit("playerInput", {
      vx,
      vy,
      x: hero.x,
      y: hero.y,
      direction: hero.direction,
    });
  }
  hero.state.isIdle = hero.vx === vx && hero.vy === vy && vx === 0 && vy === 0;
}

function setCamera(scene, hero) {
  scene.cameras.main.setZoom(2);
  scene.cameras.main.startFollow(hero, true);
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

function changeMap(scene, roomName) {
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

  return { collideLayer };
}

export default SceneMain;
