import "./phaser";
import { mapList, QuestBuilder } from "@/shared/content";
import { Server } from "socket.io";
import path from "path";
import { getTickRoomState, getBuffRoomState } from "./utils";
import { RoomManager } from "./room-manager";
import { PartyManager } from "./party-manager";
import Phaser from "phaser";
import { DEFAULT_SERVER_FPS } from "../shared";
import { cloneDeep } from "lodash";
import {
  createSnapshot,
  createDeltaSnapshot,
  compactTickDeltaForWire,
  diffTickStates,
  compactTickState,
  type ClientToServerEvents,
  type GameIo,
  type ServerToClientEvents,
} from "@/shared/network";
import { SNAPSHOT_KEYFRAME_INTERVAL } from "@/shared/constants";
import { listenForConnections } from "./net/connection";
import { shouldPause } from "./net/scene-pause";

const serverFps =
  parseInt(process.env.SERVER_FPS || String(DEFAULT_SERVER_FPS), 10) || DEFAULT_SERVER_FPS;
global.phaserOnNodeFPS = serverFps;

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
      const assetPath = path.resolve(process.env.PUBLIC_DIR || "public", asset.json);
      this.load.tilemapTiledJSON(asset?.name, assetPath);
    });
    /* Should we pause or resume? */
    shouldPause(this);
  }

  create() {
    const scene = this;
    this.players = {};
    this.doors = {};
    this.npcs = {};
    this.loots = {};
    this.spells = {};
    this.quests = QuestBuilder.buildAllQuests();
    this.roomManager = new RoomManager(scene);
    this.partyManager = new PartyManager(scene);

    listenForConnections(scene);
  }
  update(time: number, delta: number) {
    /* Memory saver */
    const scene = this;
    const io = scene.io;
    for (const room of Object.values(scene.roomManager.rooms)) {
      /* Simulate first so snapshots match what clients see on the next frame (loot expiry, spawns). */
      room.lootManager.spawnMapLoots();
      room.lootManager.expireLoots();
      room.spellManager.expireSpells();

      room.snapshotSeq += 1;

      const roomClients = io.sockets.adapter.rooms.get(room.name)?.size ?? 0;

      const hasBuffChanges = [...Object.values(scene.players), ...Object.values(scene.npcs)].some(
        (n: { room?: { name?: string }; state?: { hasBuffChanges?: boolean } }) =>
          n?.room?.name === room.name && n?.state?.hasBuffChanges,
      );
      if (hasBuffChanges && roomClients > 0) {
        io.to(room.name).emit("buffUpdate", getBuffRoomState(scene, room.name));
      }

      if (roomClients === 0) {
        room.lastEmittedSnapshot = null;
        continue;
      }

      const expanded = getTickRoomState(scene, room.name);

      const isKeyframe =
        room.snapshotSeq % SNAPSHOT_KEYFRAME_INTERVAL === 0 || room.lastEmittedSnapshot === null;

      if (isKeyframe) {
        const snapshot = createSnapshot(compactTickState(expanded), room.snapshotSeq);
        room.lastEmittedSnapshot = cloneDeep(expanded);
        io.to(room.name).emit("update", snapshot);
        continue;
      }

      const { delta, rm, isEmpty } = diffTickStates(room.lastEmittedSnapshot!, expanded);
      if (isEmpty) {
        continue;
      }
      room.lastEmittedSnapshot = cloneDeep(expanded);
      const snap = createDeltaSnapshot(compactTickDeltaForWire(delta), rm, room.snapshotSeq);
      io.to(room.name).emit("update", snap);
    }
  }
}

export class GameServer {
  io: GameIo;
  game: Phaser.Game;
  spawnTime: number;
  db: any;
  constructor({ httpServer, db }) {
    this.spawnTime = Date.now();

    this.io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
      /* Bundled client — do not serve the legacy /socket.io/socket.io.js asset. */
      serveClient: false,
      /* WebSocket only — must match client (no polling transport). */
      transports: ["websocket"],
      cors: {
        origin: "*",
      },
      /* Fly / TLS terminators often mishandle WS permessage-deflate → "Invalid frame header" in logs.
         Uncompressed WS is fine for Socket.IO; re-enable compression only if you verify the edge proxy. */
      perMessageDeflate: false,
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
        target: serverFps,
      },
      roundPixels: false,
      physics: {
        default: "arcade",
        arcade: {
          gravity: {
            x: 0,
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
