/** @type {import("phaser/types/phaser.d.ts")} */
const path = require("path");
require("@geckos.io/phaser-on-nodejs");
require("dotenv").config({ path: path.join(__dirname, "/../client/.env") });
const { mapList } = require("../client/src/Maps");
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
  getRoomState,
  initMapRooms,
  changeMap,
  getDoor,
} = require("./utils");

global.phaserOnNodeFPS = process.env.REACT_APP_SERVER_FPS;

app.use(express.static(path.join(__dirname, "../client/build")));

class ServerScene extends Phaser.Scene {
  preload() {
    mapList.forEach((asset) => {
      this.load.tilemapTiledJSON(
        asset?.name,
        path.join(__dirname, `../client/public/${asset.json}`)
      );
    });
  }
  create() {
    const scene = this;
    scene.players = {};
    scene.doors = {};
    scene.mapRooms = initMapRooms(scene);

    io.on("connection", (socket) => {
      const socketId = socket.id;

      socket.on("login", () => {
        console.log("🧑🏻‍🦰 login");
        /* TODO: Load from mongoDb */
        const user = {
          socketId,
          x: 1000,
          y: 1500,
          room: "town",
        };

        const player = addPlayer(scene, user);
        const room = player?.room;

        if (!room) console.log("❌ Missing player room");

        socket.join(room);
        socket.emit("heroInit", {
          players: getRoomState(scene, room)?.players,
          socketId,
        });
        socket.broadcast.to(room).emit("newPlayer", getPlayerState(player));
      });

      socket.on("enterDoor", (doorName) => {
        /* TODO: Make me work!!!! */
        const player = scene.players[socketId];
        socket.broadcast.to(player.room).emit("remove", socketId);
        const door = getDoor(scene, player.room, doorName)?.getProps();
        const destDoor = getDoor(
          scene,
          door.destMap,
          door.destDoor
        )?.getProps();
        /* Need to teleport if same here */
        changeMap(scene, socketId, door.destMap, destDoor);
        socket.leave(player.room);
        socket.join(door.destMap);
        socket.emit("heroInit", {
          players: getRoomState(scene, door.destMap)?.players,
          socketId,
        });
        console.log(socket.rooms);
      });

      socket.on("disconnect", () => {
        console.log("🧑🏻‍🦰 disconnected");
        removePlayer(scene, socketId);
        delete scene.players?.[socketId];
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
