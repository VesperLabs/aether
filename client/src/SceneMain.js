import Phaser from "phaser";
import { addPlayer, getPlayer, setPlayerCollision } from "./utils";
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

    this.socket.on("tick", (players) => {
      for (const p of players) {
        const player = getPlayer(this, p.socketId);
        if (!player) continue;
        player.targetX = p.x;
        player.targetY = p.y;
      }
    });

    this.socket.on("heroInit", (player) => {
      if (this.hero) return;
      const { collideLayer } = changeMap(this, "map-grassland");
      this.hero = addPlayer(this, { ...player, isHero: true });
      setPlayerCollision(this, this.hero, [collideLayer]);
      setCamera(this, this.hero);
      addJoystick(this);
    });

    this.socket.on("newPlayer", (player) => {
      addPlayer(this, player);
    });

    this.socket.on("currentPlayers", (players) => {
      for (const player of players) {
        addPlayer(this, player);
      }
    });

    this.socket.on("remove", (socketId) => {
      const player = getPlayer(this, socketId);
      player.destroy();
    });

    this.socket.emit("login");
  }

  update() {
    if (!this.socket || !this.hero) return;
    for (const player of this.players.getChildren()) {
      if (player.isHero) continue;
      player.setPosition(player.targetX, player.targetY);
    }

    const { left, up, down, right } = this.hero.input || {};
    if (left) {
      this.hero.body.setVelocityX(-200);
      if (right) {
        this.hero.body.setVelocityX(0);
      }
    } else if (right) {
      this.hero.body.setVelocityX(200);
      if (left) {
        this.hero.body.setVelocityX(0);
      }
    } else {
      this.hero.body.setVelocityX(0);
    }
    if (up) {
      this.hero.body.setVelocityY(-200);
      if (down) {
        this.hero.body.setVelocityY(0);
      }
    } else if (down) {
      this.hero.body.setVelocityY(200);
      if (up) {
        this.hero.body.setVelocityY(0);
      }
    } else {
      this.hero.body.setVelocityY(0);
    }

    this.hero.body.setVelocityX(this.joystick.deltaX);
    this.hero.body.setVelocityY(this.joystick.deltaY);

    /* TODO: Stop sending when player is standing still */
    this.hero.input.left = this.cursorKeys.left.isDown;
    this.hero.input.right = this.cursorKeys.right.isDown;
    this.hero.input.up = this.cursorKeys.up.isDown;
    this.hero.input.down = this.cursorKeys.down.isDown;

    this.socket.emit("playerInput", {
      x: this.hero.x,
      y: this.hero.y,
    });
  }
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
function addJoystick(scene) {
  scene.joystick = scene.add.joystick({
    sprites: {
      base: "",
      body: "",
      cap: "",
    },
    singleDirection: false,
    maxDistanceInPixels: 50,
    device: 0, // 0 for mouse pointer (computer), 1 for touch pointer (mobile)
  });
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
