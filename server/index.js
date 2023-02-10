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

global.phaserOnNodeFPS = process.env.FPS;

app.use(cors());
app.use(express.static(path.join(__dirname, "../client/build")));

class ServerScene extends Phaser.Scene {
  constructor() {
    super();
  }
  create() {
    this.playersGroup = this.add.group();
    io.on("connection", (socket) => {
      console.log("a user connected");
      socket.on("disconnect", () => {
        console.log("user disconnected");
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
