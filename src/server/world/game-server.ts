import type { ServerWorld } from "./server-world";
import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import type { Database } from "@/server/persistence/database";
import { trackSaves, type TrackedDatabase } from "@/server/persistence/track-saves";
import { createTickLoop } from "@/rules/world/tick-loop";
import { realClock, type Clock } from "@/rules/world/clock";
import type { Logger } from "@/server/log/logger";
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
  db: TrackedDatabase;
  constructor({
    httpServer,
    db,
    config,
    clock = realClock,
    seed,
    logger,
  }: {
    httpServer: HttpServer;
    db: Database;
    config: ServerConfig;
    /** The game clock. Simulations pass a virtual one to drive time. */
    clock?: Clock;
    /** Seeds the world's dice so a run repeats. */
    seed?: number;
    logger?: Logger;
  }) {
    this.spawnTime = clock.now();

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

    this.db = trackSaves(db);
    this.world = createServerWorld({ io: this.io, db: this.db, config, clock, seed, logger });
    this.world.loop = createTickLoop(this.world, serverSystems, {
      fps: config.fps,
      clock,
      onError: (error) => this.world.log.error("Tick failed", error),
    });
    listenForConnections(this.world);
    /* Nobody is connected yet, so the loop stays paused until the first player joins. */
  }
  /**
   * Shuts the game down and waits for all of it: stops the tick loop, saves every connected
   * player, disconnects the sockets, and waits for every database write still in flight. It does
   * not close the database; the caller owns that.
   */
  async close() {
    this.world.loop.stop();
    const saves = Object.values(this.world.players ?? {}).map((player) =>
      this.db.updateUser(player),
    );
    await Promise.allSettled(saves);
    await this.io.close();
    await this.db.settled();
  }
  getUptime() {
    return this.world.now() - this.spawnTime;
  }
}
