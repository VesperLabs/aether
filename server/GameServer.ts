import "@geckos.io/phaser-on-nodejs";
import { mapList } from "../shared/Maps";
import { Socket, Server } from "socket.io";
import path from "path";
import crypto from "crypto";
import {
  handlePlayerInput,
  getFullCharacterState,
  getRoomState,
  getTickRoomState,
  getDoor,
  removePlayer,
  cloneObject,
  checkSlotsMatch,
  SHOP_INFLATION,
  getBuffRoomState,
  PLAYER_DEFAULT_SPAWN,
} from "./utils";
import RoomManager from "./RoomManager";
import PartyManager from "./PartyManager";
import Phaser from "phaser";
import QuestBuilder from "./QuestBuilder";
import ItemBuilder from "../shared/ItemBuilder";
import { isNil } from "lodash";
import { CONSUMABLES_BASES, POTION_BASES, skinTints, hairTints } from "../shared";
import { createBaseUser } from "./db";
const { SnapshotInterpolation } = require("@geckos.io/snapshot-interpolation");
const SI = new SnapshotInterpolation();
global.phaserOnNodeFPS = parseInt(process.env.SERVER_FPS);

class ServerScene extends Phaser.Scene implements ServerScene {
  public doors: Record<string, Door>;
  public loots: Record<string, Loot>;
  public npcs: Record<string, Npc>;
  public quests: Record<string, Quest>;
  public players: Record<string, ServerPlayer>;
  public roomManager: RoomManager;
  public partyManager: PartyManager;
  public spells: any;
  public db: any;
  public io: any;

  constructor({ io, db }) {
    super({ key: "ServerScene" });
    this.io = io;
    this.db = db;
  }

  async preload() {
    /* Need to install plugins here in headless mode */
    // this.game.plugins.installScenePlugin("x", X, "x", this.scene.scene, true);
    mapList.forEach((asset: MapAsset) => {
      const assetPath = path.join(__dirname, `${process.env.PUBLIC_DIR}/${asset.json}`);
      this.load.tilemapTiledJSON(asset?.name, assetPath);
    });
    /* Should we pause or resume? */
    shouldPause(this);
  }

  create() {
    const scene = this;
    const io = this.io;
    this.players = {};
    this.doors = {};
    this.npcs = {};
    this.loots = {};
    this.spells = {};
    this.quests = QuestBuilder.buildAllQuests();
    this.roomManager = new RoomManager(scene);
    this.partyManager = new PartyManager(scene);

    io.on("connection", (socket: Socket) => {
      const socketId = socket.id;
      let peerId = null;

      socket.on("demoLogin", async ({ charClass } = {}) => {
        if (!charClass) return socket.emit("formError", { error: "No class" });

        /* Only let one connection at a time */
        if (Object.keys(this?.players).find((k) => k === socket?.id)) {
          return console.log("❌ Socket already logged in");
        }

        const user = createBaseUser(charClass);

        const player = scene.roomManager.rooms[user.roomName].playerManager.create({
          socketId,
          peerId,
          isDemoAccount: true,
          ...user,
        });

        /* Should we pause or resume? */
        shouldPause(scene);

        const roomName = player?.room?.name;

        roomName
          ? console.log(`🔌 ${player?.profile?.userName} connected`)
          : console.log("❌ Missing player roomName");

        if (!roomName) return;

        socket.join(roomName);
        socket.emit(
          "heroInit",
          {
            ...getRoomState(scene, roomName),
            userSettings: player.userSettings,
            socketId,
          },
          { isLogin: true }
        );

        socket.to(roomName).emit("playerJoin", getFullCharacterState(player), { isLogin: true });
      });

      socket.on("login", async ({ email, password } = {}) => {
        let user = await scene.db.getUserByLogin({ email, password });
        if (!user) return socket.emit("formError", { error: "Invalid login" });

        /* Only let one connection at a time */
        if (Object.keys(this?.players).find((k) => k === socket?.id)) {
          return console.log("❌ Socket already logged in");
        }

        /* Kick the old user if loggin in on same email */
        for (const [sId, player] of Object.entries(this?.players)) {
          if (player?.email === user?.email) {
            const player = scene.players?.[sId];
            console.log(`🔌 ${player?.profile?.userName} disconnected`);
            this.partyManager.removeSocketFromParty(socket);
            removePlayer(scene, sId);

            io?.sockets?.sockets?.get?.(sId)?.disconnect?.(true);
            io.emit("remove", sId);
          }
        }

        const player = scene.roomManager.rooms[user.roomName].playerManager.create({
          socketId,
          peerId,
          ...user,
        });

        /* Should we pause or resume? */
        shouldPause(scene);

        const roomName = player?.room?.name;

        roomName
          ? console.log(`🔌 ${player?.profile?.userName} connected`)
          : console.log("❌ Missing player roomName");

        if (!roomName) return;

        socket.join(roomName);
        socket.emit(
          "heroInit",
          {
            ...getRoomState(scene, roomName),
            userSettings: player.userSettings,
            socketId,
          },
          { isLogin: true }
        );
        socket.to(roomName).emit("playerJoin", getFullCharacterState(player), { isLogin: true });
      });

      socket.on("register", async ({ email, password, charClass } = {}) => {
        // Validate email format
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
          return socket.emit("formError", { error: "Invalid email format" });
        }

        // Check if email is already in use
        const user = await scene.db.getUserByEmail({ email });
        if (user) {
          return socket.emit("formError", { error: "Email already in use" });
        }

        //Validate password strength
        const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/;
        if (password?.length < 4) {
          return socket.emit("formError", {
            error: "Weak password",
          });
        }

        // Create user if email and password are valid
        const isCreated = await scene.db.createUser({ email, password, charClass });
        if (!isCreated) {
          return socket.emit("formError", { error: "Error creating user" });
        }

        // Send success message
        socket.emit("formSuccess", { success: "Account created", email });
      });

      socket.on("latency", function (startTime, cb) {
        cb(startTime);
      });

      socket.on("attack", ({ count, direction, castAngle, abilitySlot } = {}) => {
        const player = scene.players[socketId];

        // attack-spells like flame-slash also respect the spell-cooldown...
        if (abilitySlot && !player.canCastSpell(abilitySlot)) return;

        player.doAttack({ count, direction, castAngle, abilitySlot });

        socket
          .to(player?.roomName)
          .emit("playerAttack", { socketId, count, direction, castAngle, abilitySlot });
      });

      socket.on("castSpell", ({ abilitySlot, castAngle } = {}) => {
        const player = scene.players[socketId];
        player.doCast({ abilitySlot, castAngle });
        socket.to(player?.roomName).emit("playerCastSpell", { socketId, abilitySlot, castAngle });
      });

      socket.on("updateState", (state) => {
        const player = scene?.players?.[socketId];
        if (!player) return;
        // Loop through each key in the state object
        for (const key in state) {
          if (state.hasOwnProperty(key)) {
            // Update the corresponding key in player's state
            player.state[key] = state[key];
          }
        }
      });

      socket.on("grabLoot", ({ lootId, direction } = {}) => {
        if (scene.loots[lootId]?.expiredSince) return; //loot expired, do not let them pick it
        const player = scene.players[socketId];
        const loot = cloneObject(scene.loots[lootId]);
        const item = loot?.item;
        if (!loot || !player || !item) return;
        if (player?.state?.isDead) return;
        /* Face the loot */
        player.direction = direction;
        /* Check where to put loot */
        if (item.type === "stackable") {
          let foundItem =
            player?.findBagItemById(item?.id)?.["item"] ||
            player.findAbilityById(item.id)?.["item"] ||
            player.findInventoryItemById(item.id);
          if (foundItem) {
            /* Delete loot from server */
            scene.roomManager.rooms[player?.roomName].lootManager.remove(lootId);
            /* TODO: a function that handles setting an items amount
            - Needs to handle strings and nullish values
             */
            foundItem.amount = parseInt(foundItem.amount || 0) + parseInt(item?.amount || 0);
          } else {
            /* If our inventory is full we do not pick it up */
            if (player.isInventoryFull()) {
              return socket.emit("message", {
                type: "error",
                message: "Inventory is full.",
              });
            }
            /* Delete loot from server */
            scene.roomManager.rooms[player?.roomName].lootManager.remove(lootId);
            player.addInventoryItem(item);
          }
        } else {
          /* If our inventory is full we do not pick it up */
          if (player.isInventoryFull()) {
            return socket.emit("message", {
              type: "error",
              message: "Inventory is full.",
            });
          }
          /* Delete loot from server */
          scene.roomManager.rooms[player?.roomName].lootManager.remove(lootId);
          player.addInventoryItem(item);
        }
        /* Save player */
        scene.db.updateUser(player);
        io.to(player?.roomName).emit("lootGrabbed", {
          socketId,
          loot,
          /* TODO: This is a big state update. Probably only need to update inventory and quests */
          player: getFullCharacterState(player),
        });
      });

      socket.on("respawn", () => {
        const player = scene.players[socketId];
        const oldRoom = player.room.name;
        const { roomName: newRoom, x: newX, y: newY } = player?.spawn ?? PLAYER_DEFAULT_SPAWN;
        player.state.isDead = false;
        player.fillHpMp();

        if (oldRoom !== newRoom) {
          socket.leave(oldRoom);
          socket.join(newRoom);
          socket.to(oldRoom).emit("remove", socketId);
        }

        scene.roomManager.rooms[oldRoom].playerManager.remove(socketId);
        scene.roomManager.rooms[newRoom].playerManager.add(socketId);

        player.x = newX;
        player.y = newY;

        /* Save the new room */
        scene.db.updateUserMapDetails(player);

        socket.to(newRoom).emit("playerJoin", getFullCharacterState(player), {
          isRespawn: true,
          lastTeleport: Date.now(),
        });

        socket.emit("heroInit", {
          ...getRoomState(scene, newRoom),
          socketId,
        });

        // announce room has changed to the party
        // TODO: need a better way of sending a persistant party state instead of this
        if (player?.partyId) {
          const party = this.partyManager.getPartyById(player?.partyId);
          party.updateMember(player?.id, { roomName: player?.roomName });
          io.to(party.socketRoom).emit("partyUpdate", {
            party,
          });
        }

        scene.db.updateUser(scene.players?.[socketId]);
      });

      socket.on("changeDirection", ({ direction, lastAngle }) => {
        const player = scene.players[socketId];
        player.direction = direction;
        if (typeof lastAngle !== "undefined") player.state.lastAngle = lastAngle;
      });

      socket.on("enterDoor", (doorName) => {
        const player = scene.players[socketId];
        const oldRoom = player.room.name;
        const prev = getDoor(scene, oldRoom, doorName)?.getProps();
        const next = getDoor(scene, prev.destMap, prev.destDoor)?.getProps();

        if (oldRoom !== prev.destMap) {
          socket.leave(oldRoom);
          socket.join(prev.destMap);
          socket.to(oldRoom).emit("remove", socketId);
          scene.roomManager.rooms[oldRoom].playerManager.remove(socketId);
          scene.roomManager.rooms[prev.destMap].playerManager.add(socketId);
        }

        player.x = next.centerPos.x;
        player.y = next.centerPos.y;

        /* Save the new room */
        scene.db.updateUserMapDetails(player);

        socket.to(prev.destMap).emit("playerJoin", getFullCharacterState(player), {
          lastTeleport: Date.now(),
        });

        socket.emit("heroInit", {
          ...getRoomState(scene, prev.destMap),
          socketId,
        });

        // announce room has changed to the party
        // TODO: need a better way of sending a persistant party state instead of this
        if (player?.partyId) {
          const party = this.partyManager.getPartyById(player?.partyId);
          party.updateMember(player?.id, { roomName: player?.roomName });
          io.to(party.socketRoom).emit("partyUpdate", {
            party,
          });
        }
      });

      socket.on("disconnect", () => {
        const player = scene.players?.[socketId];
        scene.db.updateUser(scene.players?.[socketId]);
        console.log(`🔌 ${player?.profile?.userName ?? "Anonymous"} disconnected`);
        this.partyManager.removeSocketFromParty(socket);
        removePlayer(scene, socketId);
        io.emit("remove", socketId);
        /* Should we pause or resume? */
        shouldPause(scene);
      });

      socket.on("dropItem", ({ location, bagId, item, ...rest } = {}) => {
        /* Prevent dropping full bags */
        if (item?.base === "bag" && item?.items?.filter((i: Item) => i)?.length > 0) {
          return socket.emit("message", {
            type: "error",
            message: "Cannot drop a bag with items inside of it.",
          });
        }

        const amount = Math.abs(parseInt(rest?.amount)) || 1;
        const player = scene?.players?.[socketId];
        let found = null;
        let dropAmount: integer;

        if (location === "equipment") {
          const { item: f, slotName } = player?.findEquipmentById(item?.id);
          found = f;
          /* Remove it from the players equipment */
          player?.clearEquipmentSlot(slotName);
        }

        if (location === "abilities") {
          const { item: f, slotName } = player?.findAbilityById(item?.id);
          found = f;
          if (amount >= found?.amount) {
            dropAmount = found?.amount;
            player?.clearAbilitySlot(slotName);
          } else {
            dropAmount = player?.subtractAbilityAtId(item?.id, amount);
            if (!dropAmount) return;
          }
        }

        if (location === "inventory") {
          found = player?.findInventoryItemById(item?.id);
          if (amount >= found?.amount) {
            dropAmount = found?.amount;
            player?.deleteInventoryItemAtId(item?.id);
          } else {
            dropAmount = player?.subtractInventoryItemAtId(item?.id, amount);
            if (!dropAmount) return;
          }
        }

        if (location === "bag") {
          found = cloneObject(player?.findBagItemById(item?.id)?.["item"]);
          if (amount >= found?.amount) {
            dropAmount = found?.amount;
            player?.deleteBagItemAtId(item?.id);
          } else {
            dropAmount = player?.subtractBagItemAtId(item?.id, amount);
            if (!dropAmount) return;
          }
        }

        if (!found) return;

        player?.calculateStats();

        /* Make the item pop up where they dropped it */
        const coords: Coordinate = { x: player?.x, y: player?.y };
        if (player?.direction === "left") coords.x -= 16;
        if (player?.direction === "right") coords.x += 16;
        if (player?.direction === "up") coords.y -= 16;
        if (player?.direction === "down") coords.y += 16;

        /* Spawn the loot on the server */
        scene.roomManager.rooms[player?.roomName].lootManager.create({
          ...coords,
          item: { ...found, ...(dropAmount ? { amount: dropAmount } : {}) },
          npcId: null,
        });
        /* Save the users data */
        scene.db.updateUser(player);
        io.to(player?.roomName).emit("playerUpdate", getFullCharacterState(player));
      });

      socket.on("moveItem", ({ to, from } = {}) => {
        const player = scene?.players?.[socketId];
        let toItem, fromItem;

        /* Clone the from item so we can work with it */
        if (from?.location === "inventory") {
          from.itemId = player?.inventory?.[from?.slot]?.id;
          fromItem = cloneObject(player?.findInventoryItemById(from?.itemId));
        }
        if (from?.location === "equipment") {
          from.itemId = player?.equipment?.[from?.slot]?.id;
          fromItem = cloneObject(player?.findEquipmentById(from?.itemId))?.item;
        }
        if (from?.location === "abilities") {
          from.itemId = player?.abilities?.[from?.slot]?.id;
          fromItem = cloneObject(player?.findAbilityById(from?.itemId))?.item;
        }
        if (from?.location === "shop") {
          const npcId = player?.state?.targetNpcId;
          const shopSlot = scene?.npcs?.[npcId]?.keeperData?.shop?.[from?.slot];
          const isStackable = shopSlot?.item?.slot === "stackable";
          if (!npcId) return;
          if (!shopSlot?.stock) return;
          if (to?.location === "shop") return;
          from.itemId = shopSlot?.item?.id;
          fromItem = cloneObject({
            ...(shopSlot?.item || {}),
            /* If its stackable it gets a non-unique ID */
            id: isStackable ? from.itemId : crypto.randomUUID(),
            /* Stackable items support amounts */
            ...(isStackable ? { amount: from?.amount } : {}),
          });
        }

        if (from?.location === "bag") {
          fromItem = cloneObject(player?.findBagItemBySlot(from?.bagId, from?.slot));
          from.itemId = fromItem?.id;
        }

        /* Clone the to item so we can work with it */
        if (to?.location === "inventory") {
          to.itemId = player?.inventory?.[to?.slot]?.id;
          toItem = cloneObject(player?.findInventoryItemById(to?.itemId));
        }
        if (to?.location === "equipment") {
          to.itemId = player?.equipment?.[to?.slot]?.id;
          toItem = cloneObject(player?.findEquipmentById(to?.itemId))?.item;
        }
        if (to?.location === "abilities") {
          to.itemId = player?.abilities?.[to?.slot]?.id;
          toItem = cloneObject(player?.findAbilityById(to?.itemId))?.item;
        }
        if (to?.location === "bag") {
          /* Dragging directly into a bag */
          if (to?.slot) {
            toItem = cloneObject(player?.findBagItemBySlot(to?.bagId, to?.slot));
            /* Dragging on a bag */
          } else {
            to.slot = player.findOpenBagSlot(to?.bagId, fromItem);
            toItem = cloneObject(player?.findBagItemBySlot(to?.bagId, to?.slot));
            if (isNil(to?.slot))
              return socket.emit("message", {
                type: "error",
                message: "Bag is full.",
              });
          }
          to.itemId = toItem?.id;
        }

        /* Cannot put bags in bags */
        if (fromItem?.base === "bag" && to?.bagId)
          return socket.emit("message", {
            type: "error",
            message: "Cannot put bags in bags.",
          });

        /* Same non-stackable item, return */
        if (from.itemId === to.itemId) {
          if (fromItem?.slot !== "stackable" && toItem?.slot !== "stackable") return;
        }

        /* Inventory -> Inventory */
        if (from?.location === "inventory" && to?.location === "inventory") {
          player?.deleteInventoryItemAtId(from?.itemId);
          player.inventory[to?.slot] = fromItem;
          player.inventory[from?.slot] = toItem;
        }

        /* Inventory -> Equipment */
        if (from?.location === "inventory" && to?.location === "equipment") {
          if (fromItem && !checkSlotsMatch(fromItem?.slot, to?.slot)) return;
          player?.deleteInventoryItemAtId(from?.itemId);
          player.equipment[to?.slot] = fromItem;
          player.inventory[from?.slot] = toItem;
        }

        /* Inventory -> Abilities */
        if (from?.location === "inventory" && to?.location === "abilities") {
          if (!["spell", "stackable"].includes(fromItem?.type)) return;
          player?.deleteInventoryItemAtId(from?.itemId);
          player.abilities[to?.slot] = fromItem;
          player.inventory[from?.slot] = toItem;
        }

        /* Inventory -> Bag */
        if (from?.location === "inventory" && to?.location === "bag") {
          if (!to?.bagId) return;
          player?.deleteInventoryItemAtId(from?.itemId);
          player.setBagItem(to?.bagId, to?.slot, fromItem);
          player.inventory[from?.slot] = toItem;
        }

        /* Inventory -> Shop */
        if (from?.location === "inventory" && to?.location === "shop") {
          let sellQty = Math.abs(parseInt(from?.amount)) || 1;
          const cost = Math.abs(parseInt(fromItem?.cost)) || 1;
          player?.subtractInventoryItemAtId(from?.itemId, sellQty);
          player.gold += sellQty * cost;
        }

        /* Bag -> Bag */
        if (from?.location === "bag" && to?.location === "bag") {
          if (!from?.bagId || !to?.bagId) return;
          player?.deleteBagItemAtId(from?.itemId);
          player.setBagItem(to?.bagId, to?.slot, fromItem);
          player.setBagItem(from?.bagId, from?.slot, toItem);
        }

        /* Bag -> Inventory */
        if (from?.location === "bag" && to?.location === "inventory") {
          if (!from?.bagId) return;
          player?.deleteBagItemAtId(from?.itemId);
          player.inventory[to?.slot] = fromItem;
          player.setBagItem(from?.bagId, from?.slot, toItem);
        }

        /* Bag -> Abilities */
        if (from?.location === "bag" && to?.location === "abilities") {
          if (!from?.bagId) return;
          if (!["spell", "stackable"].includes(fromItem?.type)) return;
          player?.deleteBagItemAtId(from?.itemId);
          player.abilities[to?.slot] = fromItem;
          player.setBagItem(from?.bagId, from?.slot, toItem);
        }

        /* Bag -> Equipment */
        if (from?.location === "bag" && to?.location === "equipment") {
          if (!from?.bagId) return;
          if (fromItem && !checkSlotsMatch(fromItem?.slot, to?.slot)) return;
          player?.deleteBagItemAtId(from?.itemId);
          player.equipment[to?.slot] = fromItem;
          player.setBagItem(from?.bagId, from?.slot, toItem);
        }

        /* Bag -> Shop */
        if (from?.location === "bag" && to?.location === "shop") {
          if (!from?.bagId) return;
          let sellQty = Math.abs(parseInt(from?.amount)) || 1;
          const cost = Math.abs(parseInt(fromItem?.cost)) || 1;
          player?.deleteBagItemAtId(from?.itemId);
          player.gold += sellQty * cost;
        }

        /* Equipment -> Equipment */
        if (from?.location === "equipment" && to?.location === "equipment") {
          if (!checkSlotsMatch(fromItem?.slot, to?.slot)) return;
          player?.clearEquipmentSlot(from?.slot);
          player.equipment[to?.slot] = fromItem;
          player.equipment[from?.slot] = toItem;
        }

        /* Equipment -> Inventory */
        if (from?.location === "equipment" && to?.location === "inventory") {
          if (toItem && !checkSlotsMatch(toItem?.slot, from?.slot)) return;
          player?.clearEquipmentSlot(from?.slot);
          player.inventory[to?.slot] = fromItem;
          player.equipment[from?.slot] = toItem;
        }

        /* Equipment -> Shop */
        if (from?.location === "equipment" && to?.location === "shop") {
          let sellQty = Math.abs(parseInt(from?.amount)) || 1;
          const cost = Math.abs(parseInt(fromItem?.cost)) || 1;
          player?.clearEquipmentSlot(from?.slot);
          player.gold += sellQty * cost;
        }

        /* Equipment -> Bag */
        if (from?.location === "equipment" && to?.location === "bag") {
          if (toItem && !checkSlotsMatch(toItem?.slot, fromItem?.slot)) return;
          if (!to?.bagId) return;
          player?.clearEquipmentSlot(from?.slot);
          player.setBagItem(to?.bagId, to?.slot, fromItem);
          player.equipment[from?.slot] = toItem;
        }

        /* Abilities -> Abilities */
        if (from?.location === "abilities" && to?.location === "abilities") {
          player?.clearAbilitySlot(from?.slot);
          player.abilities[to?.slot] = fromItem;
          player.abilities[from?.slot] = toItem;
        }

        /* Abilities -> Inventory */
        if (from?.location === "abilities" && to?.location === "inventory") {
          if (toItem && !checkSlotsMatch(toItem?.type, fromItem?.type)) return;
          player?.clearAbilitySlot(from?.slot);
          player.inventory[to?.slot] = fromItem;
          player.abilities[from?.slot] = toItem;
        }

        /* Abilities -> Bag */
        if (from?.location === "abilities" && to?.location === "bag") {
          if (toItem && !checkSlotsMatch(toItem?.type, fromItem?.type)) return;
          if (!to?.bagId) return;
          player?.clearAbilitySlot(from?.slot);
          player.setBagItem(to?.bagId, to?.slot, fromItem);
          player.abilities[from?.slot] = toItem;
        }

        /* Abilities -> Shop */
        if (from?.location === "abilities" && to?.location === "shop") {
          let sellQty = Math.abs(parseInt(from?.amount)) || 1;
          const cost = Math.abs(parseInt(fromItem?.cost)) || 1;
          if (sellQty >= fromItem?.amount) {
            player?.deleteAbilityAtId(from?.itemId);
          } else {
            player?.subtractAbilityAtId(from?.itemId, sellQty);
          }
          player.gold += sellQty * cost;
        }

        let forceSlot = null;

        if (from.location === "shop") {
          const buyQty = Math.abs(parseInt(fromItem?.amount)) || 1;
          const buyCost = (Math.abs(parseInt(fromItem?.cost)) || 1) * buyQty;

          /* Always need a free slot */
          /* TODO: Fix it so we can buy a stackable no matter what if it exists */
          const stackableToStackable = fromItem?.id === toItem?.id;
          const itemToBlank = !toItem?.id;
          if (!stackableToStackable && !itemToBlank) return;

          /* Check if can afford */
          if (player.gold < buyCost) {
            return socket.emit("message", {
              type: "error",
              message: "You cannot afford this item",
            });
          }

          /* Check if the stackable is already somewhere */
          forceSlot =
            player?.findBagItemById(fromItem?.id)?.["item"] ||
            player.findAbilityById(fromItem.id)?.["item"] ||
            player.findInventoryItemById(fromItem.id);
          if (fromItem.type === "stackable" && forceSlot) {
            player.gold -= buyCost || 1;
            forceSlot.amount = parseInt(forceSlot.amount || 0) + parseInt(fromItem?.amount || 0);
          }

          /* Shop -> Inventory */
          if (to?.location === "inventory" && !forceSlot) {
            player.gold -= buyCost || 1;
            /* Remove inflation cost */
            fromItem.cost = Math.floor(fromItem.cost / SHOP_INFLATION);
            player.inventory[to?.slot] = fromItem;
          }

          /* Shop -> Equipment */
          if (to?.location === "equipment" && !forceSlot) {
            if (fromItem && !checkSlotsMatch(fromItem?.slot, to?.slot)) return;
            player.gold -= buyCost || 1;
            /* Remove inflation cost */
            fromItem.cost = Math.floor(fromItem.cost / SHOP_INFLATION);
            player.equipment[to?.slot] = fromItem;
          }

          /* Shop -> Abilities */
          if (to?.location === "abilities" && !forceSlot) {
            if (!["spell", "stackable"].includes(fromItem?.type)) return;
            player.gold -= buyCost || 1;
            /* Remove inflation cost */
            fromItem.cost = Math.floor(fromItem.cost / SHOP_INFLATION);
            player.abilities[to?.slot] = fromItem;
          }

          /* Shop -> Bag */
          if (to?.location === "bag" && !forceSlot) {
            if (!to?.bagId) return;
            player.gold -= buyCost || 1;
            /* Remove inflation cost */
            fromItem.cost = Math.floor(fromItem.cost / SHOP_INFLATION);
            player.setBagItem(to?.bagId, to?.slot, fromItem);
          }
        }

        /* Save the users data */
        player?.calculateStats();
        scene.db.updateUser(player);
        io.to(player?.roomName).emit("playerUpdate", getFullCharacterState(player));
      });

      socket.on("consumeItem", ({ location, item } = {}) => {
        const player = scene?.players?.[socketId];
        let playerItem: Item;
        if (player?.state?.isDead) return;
        if (!["inventory", "abilities", "bag"].includes(location)) return;
        /* Using an item from the inventory */
        if (location === "inventory") {
          playerItem = player?.findInventoryItemById(item?.id);
          if (!CONSUMABLES_BASES?.includes(playerItem?.base)) return;
          if (!playerItem?.amount) return;
          player?.subtractInventoryItemAtId(item?.id, 1);
        }
        /* Using an item from abilities */
        if (location === "abilities") {
          const { item: found } = player?.findAbilityById(item?.id);
          playerItem = found;
          if (!CONSUMABLES_BASES?.includes(playerItem?.base)) return;
          if (!playerItem?.amount) return;
          if (playerItem?.amount <= 1) {
            player?.deleteAbilityAtId(item?.id);
          } else {
            player?.subtractAbilityAtId(item?.id, 1);
          }
        }
        /* Using an item from the inventory */
        if (location === "bag") {
          playerItem = player?.findBagItemById(item?.id)?.["item"];
          if (!CONSUMABLES_BASES?.includes(playerItem?.base)) return;
          if (!playerItem?.amount) return;
          if (playerItem?.amount <= 1) {
            player?.deleteBagItemAtId(item?.id);
          } else {
            player?.subtractBagItemAtId(item?.id, 1);
          }
        }
        /* If the item has effects */
        if (POTION_BASES.includes(playerItem.base)) {
          /* Set potion cooldown */
          player.state.lastPotion = Date.now();
          if (playerItem?.effects?.hp) {
            //const hp = (parseInt(playerItem?.effects?.hp) / 100) * player?.stats?.maxHp;
            player.modifyStat("hp", playerItem?.effects?.hp);
          }
          if (playerItem?.effects?.mp) {
            //const mp = (parseInt(playerItem?.effects?.mp) / 100) * player?.stats?.maxMp;
            player.modifyStat("mp", playerItem?.effects?.mp);
          }
        }

        /* If the item has buffs */
        if (playerItem?.base === "food") {
          for (const [buffName, level] of Object.entries(playerItem.buffs)) {
            player.addBuff({ name: buffName, level, caster: player, shouldCalculateStats: false });
          }
        }

        player?.calculateStats();
        /* Save the users data */
        scene.db.updateUser(player);
        io.to(player?.roomName).emit("playerUpdate", getFullCharacterState(player));
      });

      socket.on("playerInput", (input) => {
        handlePlayerInput(scene, socketId, input); //defined in utilites.js
      });

      socket.on("chatNpc", ({ npcId } = {}) => {
        const player: ServerPlayer = scene?.players?.[socketId];
        const npc = scene?.npcs?.[npcId];
        npc.talkingIds.push(socketId);
        player.state.targetNpcId = npcId;
        /* Quests that are of type: chat need to be updated */
        player.updateChatQuests(npc.name);
        socket.emit("keeperDataUpdate", {
          npcId: npc?.id,
          keeperData: npc?.keeperData,
          playerQuests: scene?.players?.[socketId].getQuests(),
        });
      });

      socket.on("message", (args) => {
        if (!args?.message) return;
        const player = scene?.players?.[socketId];
        // chat bubble
        if (args.message.charAt(0) === "!" && args.message.length > 1) {
          player.state.lastBubbleMessage = Date.now();
          player.state.bubbleMessage = args.message.substr(1);
          return;
        }
        if (args.message.charAt(0) === "/") {
          const command = args.message.substr(1).split(" ");
          switch (command[0]) {
            case "drop":
              const itemParams = command?.[1]?.split?.("-");
              if (!itemParams?.length) return;
              const [itemType, itemRarity, itemKey, itemAmount] = itemParams ?? [];
              scene.roomManager.rooms[player?.roomName].lootManager.create({
                x: player?.x,
                y: player?.y,
                item: ItemBuilder.buildItem(itemType, itemRarity, itemKey, itemAmount) as Item,
                npcId: null,
              });
              return socket.emit("message", {
                from: player?.profile?.userName,
                type: "chat",
                message: args.message,
              });
            case "coords":
              scene.db.updateUserMapDetails(player);
              return socket.emit("message", {
                type: "info",
                message: `x: ${Math.round(player.x)} y: ${Math.round(player.y)}`,
              });
            case "ding":
              const didLevel = player.assignExp(parseInt(command?.[1]));
              const roomState = getRoomState(scene, player?.roomName);
              return scene.io.to(player?.roomName).emit("buffUpdate", {
                players: roomState?.players?.filter((n) => n?.id === player?.id),
                playerIdsThatLeveled: didLevel ? [player?.id] : [],
              });
            case "booty":
              player.gold += parseInt(command?.[1]);
              return io.to(player?.roomName).emit("playerUpdate", getFullCharacterState(player));
            case "guns":
              let gunItem = null;
              const rarity = command?.[1];
              if (!["unique", "common", "set", "rare", "magic"]?.includes(rarity)) return;
              do {
                gunItem = ItemBuilder.rollDrop(100, 100);
              } while (gunItem?.rarity !== rarity);
              if (gunItem) {
                scene.roomManager.rooms[player?.roomName].lootManager.create({
                  x: player?.x,
                  y: player?.y,
                  item: ItemBuilder.buildItem(gunItem.type, gunItem.rarity, gunItem.key) as Item,
                  npcId: null,
                });
              }
              return socket.emit("message", {
                from: player?.profile?.userName,
                type: "chat",
                message: args.message,
              });
          }
        }
        io.to(player?.roomName).emit("message", {
          from: player?.profile?.userName,
          type: "chat",
          message: args.message,
        });
      });

      socket.on("acceptQuest", (questId: string) => {
        const player: ServerPlayer = scene?.players?.[socketId];
        const currentQuest = scene.quests?.[questId];
        const foundQuest = player?.getPlayerQuestStatus(currentQuest);
        /* If the quest wasnt there, we can accept it */
        if (!foundQuest) {
          player?.addQuest(currentQuest);
          /* Save the users data */
          scene.db.updateUser(player);
          io.to(player?.roomName).emit("playerUpdate", getFullCharacterState(player));
        }
      });

      socket.on("inviteToParty", (inviteeSocketId: string) => {
        const player: ServerPlayer = scene?.players?.[socket.id];
        const party =
          this.partyManager.getPartyById(player?.partyId) || this.partyManager.createParty(socket);
        const invitee: ServerPlayer = scene?.players?.[inviteeSocketId];

        if (!invitee) {
          return socket.emit("message", {
            type: "error",
            message: "Invalid player to invite.",
          } as Message);
        }

        if (invitee.partyId) {
          return socket.emit("message", {
            type: "error",
            message: "Player is already in a party.",
          } as Message);
        }

        party.addInvitee(inviteeSocketId);

        const inviteData: PartyInvite = {
          inviter: getFullCharacterState(player),
          partyId: party.id,
        };

        io.to(inviteeSocketId).emit("partyInvite", inviteData);
      });

      socket.on("partyAccept", (partyId: string) => {
        const player: ServerPlayer = scene.players[socketId];
        const party = this.partyManager.getPartyById(partyId);

        if (!player || !party) {
          return socket.emit("partyUpdate", {
            message: "Could not find party.",
            party: null,
            partyId,
          });
        }

        // Check if the player is already a member of the party
        if (player.partyId === partyId) {
          return socket.emit("message");
        }

        if (!party.hasInviteeId(socketId)) {
          return socket.emit("message", {
            type: "error",
            message: "You were not invited to this party.",
          } as Message);
        }

        this.partyManager.addSocketToParty(socket, partyId);
      });

      socket.on("partyLeave", () => {
        this.partyManager.removeSocketFromParty(socket);
      });

      socket.on("setSpawn", (spawn: SpawnPoint) => {
        const player: ServerPlayer = scene.players[socketId];
        player.spawn = spawn;
        this.db.updateUserMapDetails({ email: player.email, spawn });
        return socket.emit("message", {
          type: "info",
          message: "You have changed your spawn point.",
        } as Message);
      });

      socket.on("completeQuest", (questId: string) => {
        const player: ServerPlayer = scene?.players?.[socketId];
        /* If the quest is ready, we turn it in */
        const questResults = player?.completeQuest(questId);
        /* Quest failed */
        if (questResults?.error) {
          return socket.emit("message", {
            type: "error",
            message: questResults.error,
          } as Message);
        }
        /* Save the users data */
        player.calculateStats();
        scene.db.updateUser(player);
        io.to(player?.roomName).emit("playerUpdate", getFullCharacterState(player), {
          didLevel: questResults?.didLevel,
        });
      });

      socket.on("updateProfile", (args) => {
        const hairTextures = ["hair-0", "hair-1", "hair-2", "hair-3", "hair-4", "hair-5"];
        const faceTextures = ["face-1", "face-2", "face-3"];
        const whiskersTextures = ["whiskers-0", "whiskers-1", "whiskers-2", "whiskers-3"];
        const genders = ["male", "female"];
        const player = scene?.players?.[socketId];
        if (!player) return;

        const currentHairTextureIndex = hairTextures.indexOf(player?.profile?.hair?.texture);
        const currentFaceTextureIndex = faceTextures.indexOf(player?.profile?.face?.texture);
        const currentWhiskersTextureIndex = whiskersTextures.indexOf(
          player?.profile?.whiskers?.texture
        );
        const currentSkinTintIndex = skinTints.indexOf(player?.profile?.tint);
        const currentHairTintIndex = hairTints.indexOf(player?.profile?.hair?.tint);
        const currentWhiskersTintIndex = hairTints.indexOf(player?.profile?.whiskers?.tint);
        const currentGenderIndex = genders.indexOf(player?.profile?.gender);
        let nextHairTextureIndex = currentHairTextureIndex;
        let nextFaceTextureIndex = currentFaceTextureIndex;
        let nextWhiskersTextureIndex = currentWhiskersTextureIndex;
        let nextSkinTintIndex = currentSkinTintIndex;
        let nextHairTintIndex = currentSkinTintIndex;
        let nextWhiskersTintIndex = currentWhiskersTintIndex;
        let nextGenderIndex = currentGenderIndex;

        if (args?.hair?.texture === 1) {
          nextHairTextureIndex = (currentHairTextureIndex + 1) % hairTextures.length;
        } else if (args?.hair?.texture === -1) {
          nextHairTextureIndex =
            (currentHairTextureIndex - 1 + hairTextures.length) % hairTextures.length;
        }

        if (args?.face?.texture === 1) {
          nextFaceTextureIndex = (currentFaceTextureIndex + 1) % faceTextures.length;
        } else if (args?.face?.texture === -1) {
          nextFaceTextureIndex =
            (currentFaceTextureIndex - 1 + faceTextures.length) % faceTextures.length;
        }

        if (args?.whiskers?.texture === 1) {
          nextWhiskersTextureIndex = (currentWhiskersTextureIndex + 1) % whiskersTextures.length;
        } else if (args?.whiskers?.texture === -1) {
          nextWhiskersTextureIndex =
            (currentWhiskersTextureIndex - 1 + whiskersTextures.length) % whiskersTextures.length;
        }

        if (args?.skin?.tint === 1) {
          nextSkinTintIndex = (currentSkinTintIndex + 1) % skinTints.length;
        } else if (args?.skin?.tint === -1) {
          nextSkinTintIndex = (currentSkinTintIndex - 1 + skinTints.length) % skinTints.length;
        }

        if (args?.hair?.tint === 1) {
          nextHairTintIndex = (currentHairTintIndex + 1) % hairTints.length;
        } else if (args?.hair?.tint === -1) {
          nextHairTintIndex = (currentHairTintIndex - 1 + hairTints.length) % hairTints.length;
        }

        if (args?.whiskers?.tint === 1) {
          nextWhiskersTintIndex = (currentWhiskersTintIndex + 1) % hairTints.length;
        } else if (args?.whiskers?.tint === -1) {
          nextWhiskersTintIndex =
            (currentWhiskersTintIndex - 1 + hairTints.length) % hairTints.length;
        }

        if (args?.body === 1) {
          nextGenderIndex = (currentGenderIndex + 1) % genders.length;
        } else if (args?.body === -1) {
          nextGenderIndex = (currentGenderIndex - 1 + genders.length) % genders.length;
        }

        if (args?.userName) player.profile.userName = args?.userName?.substring?.(0, 16);
        if (args?.hair?.texture) player.profile.hair.texture = hairTextures[nextHairTextureIndex];
        if (args?.face?.texture) player.profile.face.texture = faceTextures[nextFaceTextureIndex];
        if (args?.whiskers?.texture)
          player.profile.whiskers.texture = whiskersTextures[nextWhiskersTextureIndex];
        if (args?.skin?.tint) player.profile.tint = skinTints[nextSkinTintIndex];
        if (args?.hair?.tint) player.profile.hair.tint = hairTints[nextHairTintIndex];
        if (args?.whiskers?.tint) player.profile.whiskers.tint = hairTints[nextWhiskersTintIndex];
        if (args?.body) player.profile.gender = genders[nextGenderIndex];

        /* Save the user's data */
        scene.db.updateUser(player);
        io.to(player?.roomName).emit("playerUpdate", getFullCharacterState(player));
      });
      socket.on("updateUserSetting", async ({ name, value }) => {
        const player: ServerPlayer = scene.players[socketId];
        await scene.db.updateUserSetting(player, {
          name,
          value,
        });
        socket.emit("updateUserSetting", { name, value });
      });
      socket.on("peerInit", (pId) => {
        peerId = pId;
      });
      socket.on("peerConnect", ({ peerId, socketId }) => {
        socket.to(socketId).emit("connectPeer", { peerId, socketId });
      });
      socket.on("peerConnect", ({ peerId, socketId }) => {
        socket.to(socketId).emit("connectPeer", { peerId, socketId });
      });
    });
  }
  update(time: number, delta: number) {
    /* Memory saver */
    const scene = this;
    const io = scene.io;
    for (const room of Object.values(scene.roomManager.rooms)) {
      const roomState = getTickRoomState(scene, room.name);
      const snapshot = SI.snapshot.create(roomState);

      room.lootManager.spawnMapLoots();
      room.lootManager.expireLoots();
      room.spellManager.expireSpells();

      room.vault.add(snapshot);
      io.to(room.name).emit("update", room.vault.get());

      /* Expire buffs */
      if ([...roomState?.npcs, ...roomState?.players]?.some((n) => n?.state.hasBuffChanges)) {
        io.to(room.name).emit("buffUpdate", getBuffRoomState(scene, room.name));
      }
    }
  }
}

export default class Game {
  io: Server;
  game: Phaser.Game;
  spawnTime: number;
  db: any;
  constructor({ httpServer, db }) {
    this.spawnTime = Date.now();

    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
      },
      perMessageDeflate: {
        threshold: 32768,
      },
    });

    this.db = db;

    this.game = new Phaser.Game({
      type: Phaser.HEADLESS,
      width: 1280,
      height: 720,
      banner: false,
      audio: {
        disableWebAudio: true,
        noAudio: true,
      },
      fps: {
        target: parseInt(process.env.SERVER_FPS),
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
      scene: [new ServerScene({ io: this.io, db: this.db })],
    });
  }
  getUptime() {
    const currentTime = Date.now();
    const uptimeInMilliseconds = currentTime - this.spawnTime;
    return uptimeInMilliseconds;
  }
}

function shouldPause(scene) {
  if (Object.keys(scene.players ?? {})?.length === 0) {
    scene.scene.pause();
    console.log("🚦 Game empty. Pausing.");
  } else {
    scene.scene.resume();
    console.log("🚦 Player joined. Resuming.");
  }
}
