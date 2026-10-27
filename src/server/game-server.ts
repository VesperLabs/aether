import type { ServerWorld } from "./server-world";
import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import type { Database } from "./persistence/database";
import { createTickLoop } from "@/rules/world";
import { DEFAULT_SERVER_FPS } from "@/network";
import type { ClientToServerEvents, GameIo, ServerToClientEvents } from "@/network";
import { createServerWorld } from "./game-world";
import { listenForConnections } from "./net/connection";
import { serverSystems } from "./tick";

const serverFps =
  parseInt(process.env.SERVER_FPS || String(DEFAULT_SERVER_FPS), 10) || DEFAULT_SERVER_FPS;

export class GameServer {
  io: GameIo;
  world: ServerWorld;
  spawnTime: number;
  db: Database;
  constructor({ httpServer, db }: { httpServer: HttpServer; db: Database }) {
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
    this.world = createServerWorld({ io: this.io, db });
    this.world.loop = createTickLoop(this.world, serverSystems, { fps: serverFps });
    listenForConnections(this.world);
    /* Nobody is connected yet, so the loop stays paused until the first player joins. */
  }
  /** Stops the tick loop and closes the socket server. */
  close() {
    this.world.loop.stop();
    this.io.close();
  }
  getUptime() {
    const currentTime = Date.now();
    const uptimeInMilliseconds = currentTime - this.spawnTime;
    return uptimeInMilliseconds;
  }
}
