//@ts-nocheck
import path from "path";
import { config } from "dotenv";
import "@geckos.io/phaser-on-nodejs";
config({ path: path.join(__dirname, "/../.env") });
const { mapList } = require("../shared/Maps");
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
  cloneObject,
  checkSlotsMatch,
} from "./utils";
import { initDatabase, baseUser } from "./db";
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
    scene.loots = {};
    scene.spells = {};
    scene.roomManager = new RoomManager(scene);
    scene.db = await initDatabase(process.env.MONGO_URL);

    io.on("connection", (socket) => {
      const socketId = socket.id;

      socket.on("login", async (email = "arf@arf.arf") => {
        const user = await scene.db.getUserByEmail(email);
        //const user = cloneObject(baseUser);
        if (!user) return console.log("❌ Player not found in db");

        const player = scene.roomManager.rooms[user.roomName].playerManager.create({
          socketId,
          ...user,
        });

        const roomName = player?.room?.name;

        roomName
          ? console.log(`🧑🏻‍🦰 ${player?.profile?.userName} connected`)
          : console.log("❌ Missing player roomName");

        if (!roomName) return;

        socket.join(roomName);
        socket.emit("heroInit", {
          ...getRoomState(scene, roomName),
          socketId,
        });
        socket.to(roomName).emit("playerJoin", getCharacterState(player));
      });

      socket.on("attack", ({ count, direction }) => {
        const player = getCharacterState(scene.players[socketId]);
        socket.to(player.roomName).emit("playerAttack", { socketId, count, direction });
      });

      socket.on("grabLoot", ({ lootId, direction }) => {
        const player = scene.players[socketId];
        const loot = cloneObject(scene.loots[lootId]);
        const item = loot?.item;
        if (!loot || !player || !item) return;
        /* Face the loot */
        player.direction = direction;
        /* Check where to put loot */
        if (item.type == "stackable") {
          let foundItem = player.findInventoryItemById(item.id);
          if (foundItem) {
            /* Delete loot from server */
            scene.roomManager.rooms[player?.roomName].lootManager.remove(lootId);
            foundItem.amount = (foundItem.amount || 0) + (item?.amount || 0);
          } else {
            /* If our inventory is full we do not pick it up */
            if (player.isInventoryFull()) return console.log("❌ Inventory full.");
            /* Delete loot from server */
            scene.roomManager.rooms[player?.roomName].lootManager.remove(lootId);
            player.addInventoryItem(item);
          }
        } else {
          /* If our inventory is full we do not pick it up */
          if (player.isInventoryFull()) return console.log("❌ Inventory full.");
          /* Delete loot from server */
          scene.roomManager.rooms[player?.roomName].lootManager.remove(lootId);
          player.addInventoryItem(item);
        }
        /* Save player */
        scene.db.updateUser(player);
        io.to(player.roomName).emit("lootGrabbed", {
          socketId,
          lootId,
          player: getCharacterState(player),
        });
      });

      socket.on("respawn", () => {
        const player = getCharacterState(scene.players[socketId]);
        player.state.isDead = false;
        player.stats.hp = Math.floor(player.stats.maxHp);
        if (player.stats.exp > 0) {
          player.stats.exp = Math.floor(player.stats.exp * 0.9);
        }
        scene.db.updateUser(scene.players?.[socketId]);
        io.to(player?.roomName).emit("respawnPlayer", player?.socketId);
      });

      socket.on("changeDirection", (direction) => {
        const player = scene.players[socketId];
        player.direction = direction;
        io.to(player.roomName).emit("changeDirection", { socketId, direction });
      });

      socket.on("hit", ({ ids, spellName }) => {
        //console.log(`🔫 ${spellName} landed on ${entity}`);
        const hero = scene.players[socketId];
        const roomName = hero?.roomName;
        /* Create hitList for npcs */
        const hitList = [];
        const npcs = getRoomState(scene, roomName, true)?.npcs;
        const players = getRoomState(scene, roomName, true)?.players;
        for (const npc of npcs) {
          if (!ids?.includes(npc.id)) continue;
          const newHit = hero.calculateDamage(npc);
          if (newHit) hitList.push(newHit);
          /* If we kill the NPC */
          if (newHit?.type === "death") {
            npc.dropLoot(hero?.stats?.magicFind);
          }
          /* TODO: Gain exp here */
        }
        for (const player of players) {
          if (!ids?.includes(player.id)) continue;
          const newHit = hero.calculateDamage(player);
          if (newHit) hitList.push(newHit);
        }
        io.to(roomName).emit("assignDamage", hitList);
      });

      socket.on("enterDoor", (doorName) => {
        const player = scene.players[socketId];
        const oldRoom = player.room.name;
        const prev = getDoor(scene, oldRoom, doorName)?.getProps();
        const next = getDoor(scene, prev.destMap, prev.destDoor)?.getProps();

        player.x = next.centerPos.x;
        player.y = next.centerPos.y;

        if (oldRoom !== prev.destMap) {
          socket.leave(oldRoom);
          socket.join(prev.destMap);
          socket.to(oldRoom).emit("remove", socketId);
        }

        scene.roomManager.rooms[oldRoom].playerManager.remove(socketId);
        scene.roomManager.rooms[prev.destMap].playerManager.add(socketId);

        socket.to(prev.destMap).emit("playerJoin", getCharacterState(player));

        socket.emit("heroInit", {
          ...getRoomState(scene, prev.destMap),
          socketId,
        });
      });

      socket.on("disconnect", () => {
        const player = scene.players?.[socketId];
        scene.db.updateUser(scene.players?.[socketId]);
        console.log(`🧑🏻‍🦰 ${player?.profile?.userName} disconnected`);
        removePlayer(scene, socketId);
        io.emit("remove", socketId);
      });

      socket.on("dropItem", ({ location, item }) => {
        const player = scene?.players?.[socketId];
        let found = null;
        /* If the item was dropped from equipment find it and what slot it came from */
        if (location === "equipment") {
          const { item: f, slotName } = player?.findEquipmentById(item?.id);
          found = f;
          /* Remove it from the players equipment */
          player?.clearEquipmentSlot(slotName);
          player?.calculateStats();
        }

        /* If the item was dropped from inventory find it and what slot it came from */
        if (location === "inventory") {
          found = player?.findInventoryItemById(item?.id);
          /* Remove it from the players inventory */
          player?.deleteInventoryItemAtId(item?.id);
          player?.calculateStats();
        }

        /* Make the item pop up where they dropped it */
        const coords = { x: player?.x, y: player?.y };
        if (player?.direction === "left") coords.x -= 16;
        if (player?.direction === "right") coords.x += 16;
        if (player?.direction === "up") coords.y -= 16;
        if (player?.direction === "down") coords.y += 16;

        /* Spawn the loot on the server */
        scene.roomManager.rooms[player.roomName].lootManager.create({
          ...coords,
          item: found,
        });
        /* Save the users data */
        scene.db.updateUser(player);
        io.to(player?.roomName).emit("playerUpdate", getCharacterState(player));
      });

      socket.on("moveItem", ({ to, from }) => {
        /* TODO: Need to ensure items and their slots match up */
        const player = scene?.players?.[socketId];
        let toItem, fromItem;
        /* Clone the items we are interacting with */
        if (from?.location === "inventory") {
          from.itemId = player?.inventory?.[from?.slot]?.id;
          fromItem = cloneObject(player?.findInventoryItemById(from?.itemId));
        }
        if (from?.location === "equipment") {
          from.itemId = player?.equipment?.[from?.slot]?.id;
          fromItem = cloneObject(player?.findEquipmentById(from?.itemId))?.item;
        }
        if (to?.location === "inventory") {
          to.itemId = player?.inventory?.[to?.slot]?.id;
          toItem = cloneObject(player?.findInventoryItemById(to?.itemId));
        }
        if (to?.location === "equipment") {
          to.itemId = player?.equipment?.[to?.slot]?.id;
          toItem = cloneObject(player?.findEquipmentById(to?.itemId))?.item;
        }

        /* Same item, return */
        if (from.itemId === to.itemId) return;

        /* Inventory -> Inventory */
        if (from?.location === "inventory" && to?.location === "inventory") {
          player?.deleteInventoryItemAtId(from?.itemId);
          player.inventory[to?.slot] = fromItem;
          player.inventory[from?.slot] = toItem;
        }

        /* Equipment -> Inventory */
        if (from?.location === "equipment" && to?.location === "inventory") {
          /* Slots don't match */
          if (toItem && !checkSlotsMatch(toItem?.slot, from?.slot)) return;
          player?.clearEquipmentSlot(from?.slot);
          player.inventory[to?.slot] = fromItem;
          player.equipment[from?.slot] = toItem;
        }

        /* Inventory -> Equipment */
        if (from?.location === "inventory" && to?.location === "equipment") {
          /* Slots don't match */
          if (fromItem && !checkSlotsMatch(fromItem?.slot, to?.slot)) return;
          player?.deleteInventoryItemAtId(from?.itemId);
          player.equipment[to?.slot] = fromItem;
          player.inventory[from?.slot] = toItem;
        }

        /* Equipment -> Equipment */
        if (from?.location === "equipment" && to?.location === "equipment") {
          /* Slots don't match */
          if (toItem && fromItem && !checkSlotsMatch(fromItem?.slot, to?.slot)) return;
          player?.clearEquipmentSlot(from?.slot);
          player.equipment[to?.slot] = fromItem;
          player.equipment[from?.slot] = toItem;
        }

        player?.calculateStats();
        /* Save the users data */
        scene.db.updateUser(player);
        io.to(player?.roomName).emit("playerUpdate", getCharacterState(player));
      });

      socket.on("playerInput", (input) => {
        handlePlayerInput(scene, socketId, input); //defined in utilites.js
      });
    });
  }
  update(time, delta) {
    const scene = this;
    for (const room of Object.values(scene.roomManager.rooms)) {
      room.lootManager.expireLoots();

      room.spellManager.expireSpells();

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

process.on("SIGINT", function () {
  process.exit();
});

process.once("SIGUSR2", function () {
  process.exit();
});
