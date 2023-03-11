import path from "path";
import { config } from "dotenv";
import "@geckos.io/phaser-on-nodejs";
config({ path: path.join(__dirname, "/../.env") });
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
import { initDatabase } from "./db";
import RoomManager from "./RoomManager";
import ItemBuilder from "./ItemBuilder";
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
  async create() {
    const scene = this;
    scene.players = {};
    scene.doors = {};
    scene.npcs = {};
    scene.roomManager = new RoomManager(scene);
    scene.db = await initDatabase(process.env.MONGO_URL);

    io.on("connection", (socket) => {
      const socketId = socket.id;

      socket.on("login", async () => {
        //const user = await scene.db.getUserByEmail(email);
        const user = {
          email: "arf@arf.arf",
          baseStats: { speed: 450, attackSpeed: 200 },
          direction: "up",
          equipment: {
            handRight: ItemBuilder.buildItem("weapon", "common", "common-sword"),
            handLeft: ItemBuilder.buildItem("weapon", "unique", "unique-claymore-soul"),
            helmet: ItemBuilder.buildItem("helmet", "unique", "unique-cap-tudwick"),
            accessory: null,
            pants: ItemBuilder.buildItem("pants", "common", "common-pants-cloth"),
            armor: ItemBuilder.buildItem("armor", "common", "common-robe-cloth"),
            boots: null,
            ring1: null,
            ring2: null,
            amulet: null,
          },
          profile: {
            userName: "Player1",
            gender: "female",
            race: "human",
            hair: { tint: "00FF00", texture: "hair-3" },
            face: { texture: "face-1" },
            headY: -50,
          },
          roomName: "grassland",
          stats: { hp: null, mp: null, exp: null },
          x: 432,
          y: 400,
        };

        const player = scene.roomManager.rooms[user.roomName].playerManager.create({
          socketId,
          ...user,
        });
        const roomName = player?.room?.name;
        console.log(`🧑🏻‍🦰 ${player?.profile?.userName} connected`);
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
        const player = getFullCharacterState(scene.players[socketId]);
        socket.to(player.roomName).emit("playerAttack", { socketId, count, direction });
      });

      socket.on("hit", ({ entity, ids, spellName }) => {
        console.log(`🔫 ${spellName} landed on ${entity}`);
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
        const player = scene.players?.[socketId];
        scene.db.updateUser(scene.players?.[socketId]);
        console.log(`🧑🏻‍🦰 ${player?.profile?.userName} disconnected`);
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
  console.log(
    `💻 Running on ${process.env.SERVER_URL}:${process.env.PORT} @ ${process.env.SERVER_FPS}fps`
  );
});

process.once("SIGUSR2", function () {
  process.kill(process.pid, "SIGUSR2");
});

process.on("SIGINT", function () {
  // this is only called on ctrl+c, not restart
  process.kill(process.pid, "SIGINT");
});
