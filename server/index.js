const path = require("path");
import "@geckos.io/phaser-on-nodejs";
require("dotenv").config({ path: path.join(__dirname, "/../.env") });
const { mapList } = require("../src/Maps");
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
import {
  addPlayer,
  removePlayer,
  handlePlayerInput,
  getFullCharacterState,
  getFullRoomState,
  getTrimmedRoomState,
  createMapRooms,
  createDoors,
  getDoor,
  setNpcCollision,
} from "./utils";

global.phaserOnNodeFPS = process.env.SERVER_FPS;

app.use(express.static(path.join(__dirname, "../public")));

class ServerScene extends Phaser.Scene {
  constructor() {
    super({ key: "ServerScene" });
  }
  preload() {
    /* Need to install plugins here in headless mode */
    // this.game.plugins.installScenePlugin(
    //   "gridEngine",
    //   GridEngine,
    //   "gridEngine",
    //   this.scene.scene,
    //   true
    // );
    mapList.forEach((asset) => {
      this.load.tilemapTiledJSON(asset?.name, path.join(__dirname, `../public/${asset.json}`));
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
    setNpcCollision(scene);

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
        const player = scene.players[socketId];
        const oldRoom = player.room;
        const prev = getDoor(scene, oldRoom, doorName)?.getProps();
        const next = getDoor(scene, prev.destMap, prev.destDoor)?.getProps();

        socket.leave(oldRoom);
        socket.join(prev.destMap);

        player.room = prev.destMap;
        player.x = next.centerPos.x;
        player.y = next.centerPos.y;

        scene.mapRooms[oldRoom].players.remove(player);
        scene.mapRooms[prev.destMap].players.add(player);

        socket.to(prev.destMap).emit("playerJoin", getFullCharacterState(scene.players[socketId]));
        socket.to(oldRoom).emit("remove", socketId);

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
  fps: {
    target: process.env.SERVER_FPS,
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
  scene: [new ServerScene()],
});

httpServer.listen(process.env.SERVER_PORT, () => {
  console.log(`💻 listening on *:${process.env.SERVER_PORT}`);
});
