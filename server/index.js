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
const { addPlayer } = require("./utils");

global.phaserOnNodeFPS = process.env.FPS;

app.use(cors());
app.use(express.static(path.join(__dirname, "../client/build")));
class ServerScene extends Phaser.Scene {
  constructor() {
    super();
  }
  preload() {
    this.load.tilemapTiledJSON(
      "map",
      "../shared/tilemaps/maps/grasslandjson.json"
    );
  }
  create() {
    const map = this.make.tilemap("map");
    const layer = map.createLayer("Collide", "map");
    layer.setCollisionByProperty({
      collides: true,
    });

    this.physics.world.setBounds(0, 0, 2560, 1920);
    this.players = this.physics.add.group();

    io.on("connection", (socket) => {
      const socketId = socket.id;

      console.log("🧑🏻‍🦰 connected");
      addPlayer({ scene: this, socketId, layer });

      socket.on("disconnect", function () {
        console.log("🧑🏻‍🦰 disconnected");
        removePlayer({ scene: this, socketId });
        io.emit("remove", socketId);
      });
    });
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
  console.log(`listening on *:${process.env.PORT}`);
});
