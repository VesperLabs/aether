/** @type {import("phaser/types/phaser.d.ts")} */
require("@geckos.io/phaser-on-nodejs");
require("dotenv").config();
const Phaser = require("phaser");
const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const cors = require("cors");
const httpServer = http.createServer(app);
const io = require("socket.io")(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
  },
});
const {
  addPlayer,
  removePlayer,
  handlePlayerInput,
  constrainVelocity,
} = require("./utils");

global.phaserOnNodeFPS = process.env.FPS;

app.use(cors());
app.use(express.static(path.join(__dirname, "../client/build")));

class ServerScene extends Phaser.Scene {
  preload() {
    this.load.tilemapTiledJSON(
      "grassland",
      path.join(__dirname, "../client/public/assets/tilemaps/grassland.json")
    );
  }
  create() {
    /* TODO: Maps will need to be stored in memory and assigned to socket rooms */
    const map = this.make.tilemap({ key: "grassland" });
    const layer = map.createLayer("Collide");
    layer.setCollisionByProperty({
      collides: true,
    });

    this.players = this.physics.add.group();

    io.on("connection", (socket) => {
      const socketId = socket.id;

      console.log("🧑🏻‍🦰 connected");
      addPlayer(this, { socketId, x: 0, y: 0 });

      socket.on("disconnect", () => {
        console.log("🧑🏻‍🦰 disconnected");
        removePlayer(this, { socketId });
        io.emit("remove", socketId);
      });

      socket.on("playerInput", (input) => {
        handlePlayerInput(this, { socketId, input }); //defined in utilites.js
      });
    });
  }
  update() {
    if (!this.players) return;
    this.players.getChildren().forEach((player) => {
      const { left, up, down, right } = player.input || {};
      if (left) {
        player.setVelocityX(-250);
        if (right) {
          player.setVelocityX(0);
        }
      } else if (right) {
        player.setVelocityX(250);
        if (left) {
          player.setVelocityX(0);
        }
      } else {
        player.setVelocityX(0);
      }
      if (up) {
        player.setVelocityY(-250);
        if (down) {
          player.setVelocityY(0);
        }
      } else if (down) {
        player.setVelocityY(250);
        if (up) {
          player.setVelocityY(0);
        }
      } else {
        player.setVelocityY(0);
      }
      constrainVelocity(player, 250);
    });
    io.emit(
      "playerUpdates",
      Array.from(this.players.getChildren()).map((p) => ({
        x: p.x,
        y: p.y,
        velocity_x: p.body.velocity.x,
        velocity_y: p.body.velocity.y,
      }))
    );
  }
}

new Phaser.Game({
  type: Phaser.HEADLESS,
  width: 1280,
  height: 720,
  banner: false,
  audio: false,
  scene: [ServerScene],
  fps: {
    target: process.env.FPS,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
    },
  },
});

httpServer.listen(process.env.PORT, () => {
  console.log(`💻 listening on *:${process.env.PORT}`);
});
