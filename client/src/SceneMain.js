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

    moveHero(this);
  }
}

function moveHero(scene) {
  const speed = 200; //TODO: Make this the same as joystick so we don't have to *4 below
  const joystick = scene.game.scene.scenes[2].joystick;
  const left = scene.cursorKeys.left.isDown;
  const right = scene.cursorKeys.right.isDown;
  const up = scene.cursorKeys.up.isDown;
  const down = scene.cursorKeys.down.isDown;
  const velocity = { x: 0, y: 0 };

  if (left) velocity.x = -speed;
  if (right) velocity.x = speed;
  if (up) velocity.y = -speed;
  if (down) velocity.y = speed;
  if (left && right) velocity.x = 0;
  if (up && down) velocity.y = 0;
  if (!left && !right && !up && !down) {
    velocity.x = 0;
    velocity.y = 0;
  }

  scene.hero.body.setVelocity(velocity.x, velocity.y);

  if (joystick.deltaX || joystick.deltaY) {
    scene.hero.body.setVelocity(joystick.deltaX * 4, joystick.deltaY * 4);
  }

  scene.socket.emit("playerInput", velocity);
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
