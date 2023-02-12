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
  getPlayer,
  handlePlayerInput,
  serializePlayer,
  serializeAllPlayers,
  setPlayerCollision,
  constrainVelocity,
} = require("../client/src/utils");

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
    const collideLayer = map.createLayer("Collide").setCollisionByProperty({
      collides: true,
    });

    this.players = this.physics.add.group();

    io.on("connection", (socket) => {
      const socketId = socket.id;

      const newPlayer = addPlayer(this, { socketId, x: 600, y: 300 });
      setPlayerCollision(this, newPlayer, [collideLayer]);

      socket.on("login", () => {
        console.log("🧑🏻‍🦰 login");
        socket.emit("heroInit", serializePlayer(newPlayer));

        // send the players object to the new player
        socket.emit("currentPlayers", serializeAllPlayers(this));

        // update all other players of the new player
        socket.broadcast.emit("newPlayer", serializePlayer(newPlayer));
      });

      socket.on("disconnect", () => {
        console.log("🧑🏻‍🦰 disconnected");
        removePlayer(this, socketId);
        io.emit("remove", socketId);
      });

      socket.on("playerInput", (input) => {
        handlePlayerInput(this, socketId, input); //defined in utilites.js
      });
    });
  }
  update() {
    if (!this.players) return;
    io.emit("tick", serializeAllPlayers(this));
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
  roundPixels: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: {
        y: 0,
      },
    },
  },
});

httpServer.listen(process.env.PORT, () => {
  console.log(`💻 listening on *:${process.env.PORT}`);
});
