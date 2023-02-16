import Phaser from "phaser";
import {
  addPlayer,
  getPlayer,
  removeAllPlayers,
  setPlayerCollision,
  removePlayer,
  constrainVelocity,
} from "./utils";
const { SnapshotInterpolation } = require("@geckos.io/snapshot-interpolation");
const SI = new SnapshotInterpolation(process.env.REACT_APP_SERVER_FPS); // the server's fps is 15
class SceneMain extends Phaser.Scene {
  constructor(socket) {
    super({ key: "SceneMain" });
    this.socket = socket;
  }

  preload() {
    this.cursorKeys = this.input.keyboard.createCursorKeys();
  }

  create() {
    this.players = this.add.group();

    this.socket.on("update", (snapshot) => {
      SI.snapshot.add(snapshot);
    });

    this.socket.on("heroInit", ({ socketId, players }) => {
      const { collideLayer } = changeMap(this, "map-grassland");
      removeAllPlayers(this);

      /* Add players that don't exist */
      for (const player of players) {
        if (socketId === player.socketId) {
          this.hero = addPlayer(this, { ...player, isHero: true });
        } else {
          addPlayer(this, player);
        }
      }

      setPlayerCollision(this, this.hero, [collideLayer]);
      setCamera(this, this.hero);
    });

    this.socket.on("newPlayer", (player) => {
      if (getPlayer(this, player.socketId)) return;
      addPlayer(this, player);
    });

    this.socket.on("remove", (socketId) => {
      removePlayer(this, socketId);
    });

    this.socket.emit("login");
  }

  update(time, delta) {
    if (!this.socket || !this.hero) return;
    const snapshot = SI.calcInterpolation("x y", "players");
    if (snapshot) {
      for (const s of snapshot.state) {
        const player = getPlayer(this, s.socketId);
        if (player) {
          /* Update player movements */
          if (!player.isHero) {
            player.setPosition(s.x, s.y);
          }
          player.vx = s.vx;
          player.vy = s.vy;
          /* Update depths */
          player.setDepth(player.y + player.height / 2);
        }
      }
    }

    /* Update Hero */
    moveHero(this);
  }
}

function moveHero(scene) {
  const speed = scene.hero.speed;
  const joystick = scene.game.scene.scenes[2].joystick;
  const left = scene.cursorKeys.left.isDown;
  const right = scene.cursorKeys.right.isDown;
  const up = scene.cursorKeys.up.isDown;
  const down = scene.cursorKeys.down.isDown;
  let vx = 0;
  let vy = 0;

  if (left) vx = -speed;
  if (right) vx = speed;
  if (up) vy = -speed;
  if (down) vy = speed;
  if (left && right) vx = 0;
  if (up && down) vy = 0;
  if (!left && !right && !up && !down) {
    vx = 0;
    vy = 0;
  }

  if (joystick.deltaX || joystick.deltaY) {
    vx = joystick.deltaX * speed;
    vy = joystick.deltaY * speed;
  }

  scene.hero.body.setVelocity(vx, vy);
  constrainVelocity(scene.hero, speed);

  /* If the hero is standing still do not update the server */
  if (!scene.hero.state.isIdle) {
    scene.socket.emit("playerInput", {
      vx,
      vy,
      x: scene.hero.x,
      y: scene.hero.y,
    });
  }
  scene.hero.state.isIdle =
    scene.hero.vx === vx && scene.hero.vy === vy && vx === 0 && vy === 0;
}

function setCamera(scene, hero) {
  scene.cameras.main.startFollow(hero, true);
  scene.cameras.main.setBounds(
    0,
    0,
    scene.tilemap.widthInPixels,
    scene.tilemap.heightInPixels
  );
  scene.cameras.main.setZoom(2);
}

function changeMap(scene, mapKey) {
  if (scene.tilemap) scene.tilemap.destroy();
  scene.tilemap = scene.make.tilemap({
    key: mapKey,
  });

  const m = mapKey.split("-");

  const tileSet = scene.tilemap.addTilesetImage("tileset-" + m[1]);
  const tilesetShadows = scene.tilemap.addTilesetImage(
    "tileset-" + m[1] + "-shadows"
  );
  const tilesetCollide = scene.tilemap.addTilesetImage("tileset-collide");
  const tilesetExtras = scene.tilemap.addTilesetImage("tileset-extras");
  const collideLayer = scene.tilemap
    .createLayer("Collide", tilesetCollide)
    .setCollisionByProperty({
      collides: true,
    });
  scene.tilemap.createLayer("Ground", tileSet);
  scene.tilemap.createLayer("Shadows", tilesetShadows);
  scene.tilemap.createLayer("Overlay", tileSet);
  scene.tilemap.createLayer("Extras", tilesetExtras);
  scene.tilemap.createLayer("Above", tileSet).setDepth(9999);

  //scene.createDoors(scene.tilemap);

  if (scene.animatedTiles) scene.animatedTiles.init(scene.tilemap);

  return { collideLayer };
}

export default SceneMain;
