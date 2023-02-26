/** @type {import("phaser/types/phaser.d.ts")} */
const path = require("path");
require("@geckos.io/phaser-on-nodejs");
require("dotenv").config({ path: path.join(__dirname, "/../client/.env") });
const { mapList } = require("../client/src/Maps");
const { spawnNpcs } = require("./Npcs");
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
  getFullCharacterState,
  getFullRoomState,
  getTrimmedRoomState,
  createMapRooms,
  changeMap,
  createDoors,
  getDoor,
  createGridEngines,
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
    scene.mapRooms = {};
    scene.npcs = {};

    createMapRooms(scene);
    createDoors(scene);
    spawnNpcs(scene);
    createGridEngines(scene);

    io.on("connection", (socket) => {
      const socketId = socket.id;

      socket.on("login", () => {
        console.log("🧑🏻‍🦰 login");
        /* TODO: Load from mongoDb */
        const user = {
          socketId,
          x: 100,
          y: 100,
          room: "grassland-2",
          profile: {
            race: "human",
            gender: "female",
            face: { color: "black", texture: "face-1" },
            hair: { color: "black", texture: "hair-3" },
          },
          equips: {
            handRight: { type: "shield", texture: "shield-round" },
            handLeft: { type: "weapon", texture: "weapon-sword-short" },
            //handRight: { type: "weapon", texture: "weapon-sword-short" },
            armor: { type: "armor", texture: "armor-plate" },
            helmet: { type: "helmet", texture: "helmet-cap-raccoon" },
            accessory: { type: "accessory", texture: "accessory-glasses" },
            boots: { type: "boots", texture: "boots-cloth" },
            pants: { type: "pants", texture: "pants-cloth" },
          },
        };

        const player = addPlayer(scene, user);
        const room = player?.room;

        if (!room) console.log("❌ Missing player room");

        socket.join(room);
        socket.emit("heroInit", {
          players: getFullRoomState(scene, room)?.players,
          npcs: getFullRoomState(scene, room)?.npcs,
          socketId,
        });
        socket.to(room).emit("playerJoin", getFullCharacterState(player));
      });

      socket.on("attack", ({ count, direction }) => {
        console.log("🧑🏻‍🦰 attacking");
        const player = getFullCharacterState(scene.players[socketId]);
        socket.to(player.room).emit("playerAttack", { socketId, count, direction });
      });

      socket.on("enterDoor", (doorName) => {
        const player = getFullCharacterState(scene.players[socketId]);
        const prev = getDoor(scene, player.room, doorName)?.getProps();
        const next = getDoor(scene, prev.destMap, prev.destDoor)?.getProps();
        socket.to(player.room).emit("remove", socketId);
        socket.leave(player.room);
        /* Need to teleport if same here */
        changeMap(scene, socketId, prev, next);
        socket.to(prev.destMap).emit("playerJoin", player);
        socket.join(prev.destMap);
        socket.emit("heroInit", {
          players: getFullRoomState(scene, prev.destMap)?.players,
          npcs: getFullRoomState(scene, prev.destMap)?.npcs,
          socketId,
        });
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
      const roomState = getTrimmedRoomState(scene, mapRoom.name);
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
  // plugins: {
  //   scene: [
  //     {
  //       key: "gridEngine",
  //       plugin: GridEngine,
  //       mapping: "gridEngine",
  //     },
  //   ],
  // },
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
