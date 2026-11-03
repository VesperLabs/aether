import path from "path";
import cors from "cors";
import express from "express";
import http from "http";
import type { AddressInfo } from "net";
import { PeerServer } from "peer";
import type { Clock } from "@/rules/world";
import type { Logger } from "@/server/log/logger";
import type { ServerConfig } from "@/server/config/config";
import { registerPeerProxy } from "@/server/http/peer-proxy";
import { registerRoutes } from "@/server/http/routes";
import type { Database } from "@/server/persistence/database";
import { GameServer } from "@/server/world/game-server";

/** A running server: the port it bound, the game it runs, and a way to shut it all down. */
export interface App {
  port: number;
  server: GameServer;
  close(): Promise<void>;
}

const closeHttp = (server: http.Server) =>
  new Promise<void>((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections();
  });

/**
 * Builds the express app, http server, game server, routes and (when `config.peerPort` is set) the
 * peerjs server, and starts listening on `config.port`. Port 0 picks a free port; the promise
 * resolves with the one that was bound.
 */
export async function createApp(
  config: ServerConfig,
  { db, clock, seed, logger }: { db: Database; clock?: Clock; seed?: number; logger?: Logger },
): Promise<App> {
  const app = express();
  const httpServer = http.createServer(app);

  let peerHttpServer: http.Server | undefined;
  if (config.peerPort !== null) {
    PeerServer({ port: config.peerPort }, (peerServer) => {
      peerHttpServer = peerServer as http.Server;
    });
  }

  const server = new GameServer({ httpServer, db, config, clock, seed, logger });

  app.use(cors({ origin: "*" }));
  app.use(express.static(path.resolve(config.publicDir)));

  registerRoutes(app, { aetherServer: server, db, config });
  if (config.peerPort !== null) registerPeerProxy(app, httpServer, config.peerPort);

  const port = await new Promise<number>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(config.port, () => resolve((httpServer.address() as AddressInfo).port));
  });

  return {
    port,
    server,
    async close() {
      server.close();
      if (peerHttpServer) await closeHttp(peerHttpServer);
      await closeHttp(httpServer);
    },
  };
}
