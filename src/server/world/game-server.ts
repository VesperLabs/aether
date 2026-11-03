import type { ServerWorld } from "./server-world";
import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import type { Database } from "@/server/persistence/database";
import { createTickLoop } from "@/rules/world";
import type { ServerConfig } from "@/server/config/config";
import type { ClientToServerEvents } from "@/network/commands";
import type { GameIo } from "@/network/socket/game-socket";
import type { ServerToClientEvents } from "@/network/messages";
import { createServerWorld } from "./game-world";
import { listenForConnections } from "@/server/net/connection";
import { serverSystems } from "./tick";

export class GameServer {
  io: GameIo;
  world: ServerWorld;
  spawnTime: number;
  db: Database;
  constructor({
    httpServer,
    db,
    config,
    now = () => Date.now(),
  }: {
    httpServer: HttpServer;
    db: Database;
    config: ServerConfig;
    /** The game clock. Tests pass their own to drive time. */
    now?: () => number;
  }) {
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
    this.world = createServerWorld({ io: this.io, db, config, now });
    this.world.loop = createTickLoop(this.world, serverSystems, { fps: config.fps, clock: now });
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
