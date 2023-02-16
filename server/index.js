/** @type {import("phaser/types/phaser.d.ts")} */
const path = require("path");
require("@geckos.io/phaser-on-nodejs");
require("dotenv").config({ path: path.join(__dirname, "/../client/.env") });
const { SnapshotInterpolation } = require("@geckos.io/snapshot-interpolation");
const Phaser = require("phaser");
const express = require("express");
const app = express();
const http = require("http");
const httpServer = http.createServer(app);
const io = require("socket.io")(httpServer, {
  cors: {
    origin: "*",
  },
});
const SI = new SnapshotInterpolation();
const {
  addPlayer,
  removePlayer,
  handlePlayerInput,
  getPlayerState,
  getWorldState,
  setPlayerCollision,
} = require("../client/src/utils");

global.phaserOnNodeFPS = process.env.REACT_APP_SERVER_FPS;

app.use(express.static(path.join(__dirname, "../client/build")));

class ServerScene extends Phaser.Scene {
  preload() {
    this.load.tilemapTiledJSON(
      "grassland",
      path.join(__dirname, "../client/public/assets/tilemaps/grassland.json")
    );
  }
  create() {
    /* TODO: Maps 
       - Will need to be stored in memory and assigned to socket rooms 
       - Maybe ditch the collide layer since we do collision on the client
       - Will need to implement collision for where NPCs are allowed to walk
    */
    const map = this.make.tilemap({ key: "grassland" });

    this.players = this.physics.add.group();

    io.on("connection", (socket) => {
      const socketId = socket.id;

      const newPlayer = addPlayer(this, {
        isServer: true,
        socketId,
        x: 600,
        y: 300,
      });
      //setPlayerCollision(this, newPlayer, []);

      socket.on("login", () => {
        console.log("🧑🏻‍🦰 login");
        socket.emit("heroInit", {
          players: getWorldState(this).players,
          socketId,
        });
        // tell all others about new player
        socket.broadcast.emit("newPlayer", getPlayerState(newPlayer));
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
  update(time, delta) {
    if (!this.players) return;
    const snapshot = SI.snapshot.create(getWorldState(this));
    SI.vault.add(snapshot);
    io.emit("update", snapshot);
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
    target: process.env.REACT_APP_SERVER_FPS,
  },
  roundPixels: false,
  physics: {
    default: "arcade",
    arcade: {
      gravity: {
        y: 0,
      },
    },
  },
});

httpServer.listen(process.env.SERVER_PORT, () => {
  console.log(`💻 listening on *:${process.env.SERVER_PORT}`);
});
