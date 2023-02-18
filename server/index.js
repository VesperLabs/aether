/** @type {import("phaser/types/phaser.d.ts")} */
const path = require("path");
require("@geckos.io/phaser-on-nodejs");
require("dotenv").config({ path: path.join(__dirname, "/../client/.env") });
const { mapList } = require("../client/src/Maps");
const {
  SnapshotInterpolation,
  Vault,
} = require("@geckos.io/snapshot-interpolation");
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
  getRoomState,
} = require("./utils");

global.phaserOnNodeFPS = process.env.REACT_APP_SERVER_FPS;

app.use(express.static(path.join(__dirname, "../client/build")));

class ServerScene extends Phaser.Scene {
  preload() {
    /* Load all map jsons */
    mapList.forEach((asset) => {
      this.load.tilemapTiledJSON(
        asset?.name,
        path.join(__dirname, `../client/public/${asset.json}`)
      );
    });
  }
  create() {
    /* TODO: Maps 
       - Will need to implement collision for where NPCs are allowed to walk
         setPlayerCollision(this, newPlayer, []);
    */
    const scene = this;
    scene.players = {};
    scene.mapRooms = mapList.reduce((acc, m) => {
      acc[m.name] = {
        name: m.name,
        map: scene.make.tilemap({ key: m.name }),
        players: scene.physics.add.group(),
        doors: scene.physics.add.group(),
        vault: new Vault(),
      };
      return acc;
    }, {});

    io.on("connection", (socket) => {
      const socketId = socket.id;

      socket.on("login", () => {
        console.log("🧑🏻‍🦰 login");
        /* TODO: Load from mongoDb */
        const user = {
          socketId,
          x: 600,
          y: 300,
          room: "grassland",
        };

        const player = addPlayer(scene, user);
        const room = player?.room;

        if (!room) console.log("❌ Missing player room");

        socket.join(room);
        socket.emit("heroInit", {
          players: getRoomState(scene, room).players,
          socketId,
        });
        socket.broadcast.to(room).emit("newPlayer", getPlayerState(player));
      });

      socket.on("enterDoor", (door) => {
        //socket.join(newPlayer.room);
      });

      socket.on("disconnect", () => {
        console.log("🧑🏻‍🦰 disconnected");
        removePlayer(scene, socketId);
        io.emit("remove", socketId);
      });

      socket.on("playerInput", (input) => {
        handlePlayerInput(scene, socketId, input); //defined in utilites.js
      });
    });
  }
  update(time, delta) {
    const scene = this;
    for (const mapRoom of Object.values(scene.mapRooms)) {
      const roomState = getRoomState(scene, mapRoom.name);
      const snapshot = SI.snapshot.create(roomState);
      mapRoom.vault.add(snapshot);
      io.to(mapRoom.name).emit("update", mapRoom.vault.get());
    }
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
