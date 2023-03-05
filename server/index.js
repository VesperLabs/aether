const path = require("path");
import "@geckos.io/phaser-on-nodejs";
require("dotenv").config({ path: path.join(__dirname, "/../.env") });
const { mapList } = require("../src/Maps");
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
  handlePlayerInput,
  getFullCharacterState,
  getFullRoomState,
  getTrimmedRoomState,
  getDoor,
  removePlayer,
} from "./utils";
import RoomManager from "./RoomManager";
global.phaserOnNodeFPS = process.env.SERVER_FPS;

app.use(express.static(path.join(__dirname, "../public")));

class ServerScene extends Phaser.Scene {
  constructor() {
    super({ key: "ServerScene" });
  }
  preload() {
    /* Need to install plugins here in headless mode */
    // this.game.plugins.installScenePlugin("x", X, "x", this.scene.scene, true);
    mapList.forEach((asset) => {
      this.load.tilemapTiledJSON(asset?.name, path.join(__dirname, `../public/${asset.json}`));
    });
  }
  create() {
    const scene = this;
    scene.players = {};
    scene.doors = {};
    scene.npcs = {};
    scene.roomManager = new RoomManager(scene);

    io.on("connection", (socket) => {
      const socketId = socket.id;

      socket.on("login", () => {
        console.log("🧑🏻‍🦰 login");
        /* TODO: Load from mongoDb */
        const user = {
          socketId,
          x: 100,
          y: 100,
          roomName: "grassland-2",
          profile: {
            race: "human",
            gender: "female",
            face: { color: "black", texture: "face-1" },
            hair: { color: "black", texture: "hair-3" },
          },
          baseStats: {
            speed: 300,
            attackSpeed: 200,
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

        const player = scene.roomManager.rooms[user.roomName].playerManager.create(user);
        const roomName = player?.room?.name;

        if (!roomName) console.log("❌ Missing player roomName");

        socket.join(roomName);
        socket.emit("heroInit", {
          players: getFullRoomState(scene, roomName)?.players,
          npcs: getFullRoomState(scene, roomName)?.npcs,
          socketId,
        });
        socket.to(roomName).emit("playerJoin", getFullCharacterState(player));
      });

      socket.on("attack", ({ count, direction }) => {
        console.log("🧑🏻‍🦰 attacking");
        const player = getFullCharacterState(scene.players[socketId]);
        socket.to(player.roomName).emit("playerAttack", { socketId, count, direction });
      });

      socket.on("enterDoor", (doorName) => {
        const player = scene.players[socketId];
        const oldRoom = player.room.name;
        const prev = getDoor(scene, oldRoom, doorName)?.getProps();
        const next = getDoor(scene, prev.destMap, prev.destDoor)?.getProps();

        socket.leave(oldRoom);
        socket.join(prev.destMap);

        player.x = next.centerPos.x;
        player.y = next.centerPos.y;

        scene.roomManager.rooms[oldRoom].playerManager.remove(socketId);
        scene.roomManager.rooms[prev.destMap].playerManager.add(socketId);

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
    for (const room of Object.values(scene.roomManager.rooms)) {
      const roomState = getTrimmedRoomState(scene, room.name);
      const snapshot = SI.snapshot.create(roomState);
      room.vault.add(snapshot);
      io.to(room.name).emit("update", room.vault.get());
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

httpServer.listen(process.env.PORT, () => {
  console.log(`💻 PORT: ${process.env.PORT}`);
  console.log(`💻 SERVER_FPS: ${process.env.SERVER_FPS}`);
  console.log(`💻 SERVER_URL: ${process.env.SERVER_URL}`);
});

process.once("SIGUSR2", function () {
  process.kill(process.pid, "SIGUSR2");
});

process.on("SIGINT", function () {
  // this is only called on ctrl+c, not restart
  process.kill(process.pid, "SIGINT");
});
