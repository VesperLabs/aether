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
  getCharacterState,
  getRoomState,
  getTrimmedRoomState,
  getDoor,
  removePlayer,
  baseUser,
} from "./utils";
import { initDatabase } from "./db";
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
  async create() {
    const scene = this;
    scene.io = io;
    scene.players = {};
    scene.doors = {};
    scene.npcs = {};
    scene.roomManager = new RoomManager(scene);
    scene.db = await initDatabase(process.env.MONGO_URL);

    io.on("connection", (socket) => {
      const socketId = socket.id;

      socket.on("login", async (email = "arf@arf.arf") => {
        //const user = await scene.db.getUserByEmail(email);
        const user = baseUser;
        if (!user) return console.log("❌ Player not found in db");

        const player = scene.roomManager.rooms[user.roomName].playerManager.create({
          socketId,
          ...user,
        });

        const roomName = player?.room?.name;

        if (!roomName) return console.log("❌ Missing player roomName");

        console.log(`🧑🏻‍🦰 ${player?.profile?.userName} connected`);
        socket.join(roomName);
        socket.emit("heroInit", {
          players: getRoomState(scene, roomName)?.players,
          npcs: getRoomState(scene, roomName)?.npcs,
          socketId,
        });
        socket.to(roomName).emit("playerJoin", getCharacterState(player));
      });

      socket.on("attack", ({ count, direction }) => {
        const player = getCharacterState(scene.players[socketId]);
        socket.to(player.roomName).emit("playerAttack", { socketId, count, direction });
      });

      socket.on("hit", ({ entity, ids, spellName }) => {
        console.log(`🔫 ${spellName} landed on ${entity}`);
        const hero = scene.players[socketId];
        const roomName = hero?.roomName;
        /* Create hitList for npcs */
        const npcHitList = [];
        const npcs = getRoomState(scene, roomName, true)?.npcs;
        for (const npc of npcs) {
          if (!ids?.includes(npc.id)) continue;
          const newHit = hero.calculateDamage(npc);
          if (newHit) npcHitList.push(newHit);
        }
        /* Create hitList for players */
        const playerHitList = [];
        const players = getRoomState(scene, roomName, true)?.players;
        for (const player of players) {
          if (!ids?.includes(player.id)) continue;
          const newHit = hero.calculateDamage(player);
          if (newHit) playerHitList.push(newHit);
        }

        io.to(roomName).emit("assignDamage", { socketId, npcHitList, playerHitList });
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

        socket.to(prev.destMap).emit("playerJoin", getCharacterState(scene.players[socketId]));
        socket.to(oldRoom).emit("remove", socketId);

        socket.emit("heroInit", {
          players: getRoomState(scene, prev.destMap)?.players,
          npcs: getRoomState(scene, prev.destMap)?.npcs,
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
