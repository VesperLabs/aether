import type { ServerWorld } from "./server-world";
import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import type { Database } from "./persistence/database";
import { createTickLoop, type Clock } from "@/rules/world";
import type { Dice } from "@/content";
import { DEFAULT_SERVER_FPS } from "@/network";
import type { ClientToServerEvents, GameIo, ServerToClientEvents } from "@/network";
import { createServerWorld } from "./game-world";
import { listenForConnections } from "./net/connection";
import { serverSystems } from "./tick";
import { realClock } from "./real-clock";

const serverFps =
  parseInt(process.env.SERVER_FPS || String(DEFAULT_SERVER_FPS), 10) || DEFAULT_SERVER_FPS;

export class GameServer {
  io: GameIo;
  world: ServerWorld;
  spawnTime: number;
  db: Database;
  constructor({
    httpServer,
    db,
    clock = realClock,
    dice,
  }: {
    httpServer: HttpServer;
    db: Database;
    /** All game time comes from here. Tests pass a manual clock to fast-forward the world. */
    clock?: Clock;
    /** Every roll and id. Pass seeded dice (`createServerDice(seed)`) to replay a run exactly. */
    dice?: Dice;
  }) {
    const now = () => clock.now();
    this.spawnTime = now();

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
    this.world = createServerWorld({ io: this.io, db, now, dice });
    this.world.tickHealth.targetTickMs = 1000 / serverFps;
    this.world.loop = createTickLoop(this.world, serverSystems, { fps: serverFps, clock });
    listenForConnections(this.world);
    /* Nobody is connected yet, so the loop stays paused until the first player joins. */
  }
  /** Stops the tick loop and closes the socket server. */
  close() {
    this.world.loop.stop();
    this.io.close();
  }
  getUptime() {
    return this.world.now() - this.spawnTime;
  }
}
