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
}

export default SceneMain;
