import "./phaser";
import path from "path";
import cors from "cors";
import express from "express";
import { GameServer } from "./game-server";
import { initDatabase, initFakeDatabase } from "./persistence";
import { registerPeerProxy } from "./http/peer-proxy";
import { registerRoutes } from "./http/routes";
import { PeerServer, PeerServerEvents } from "peer";
import { default as http, Server } from "http";

const PEER_SERVER_PORT = parseInt(process.env.PEER_SERVER_PORT);
const PORT = process.env.PORT;
const MONGO_URL = process.env.MONGO_URL;
const SERVER_URL = process.env.SERVER_URL;
const SERVER_FPS = process.env.SERVER_FPS;

class AppServer {
  private app;
  private httpServer: Server;
  private peerServer: PeerServerEvents;

  constructor() {
    this.app = express();
    this.httpServer = http.createServer(this.app);
    this.peerServer = PeerServer({ port: PEER_SERVER_PORT }, (_e) => {
      console.log(`💻 Peerserver @ /peerjs:${PEER_SERVER_PORT}`);
    });
  }

  async initialize() {
    // can run in offline mode. we don't connect to any DB or save anything.
    const db = process.env.MONGO_URL
      ? await initDatabase(process.env.MONGO_URL)
      : await initFakeDatabase();

    const app = this.app;
    const httpServer = this.httpServer;
    const aetherServer = new GameServer({ httpServer, db });

    app.use(
      cors({
        origin: "*", // Replace with your allowed origin
      }),
    );

    app.use(express.static(path.resolve(process.env.PUBLIC_DIR || "public")));

    registerRoutes(app, { aetherServer, db });
    registerPeerProxy(app, httpServer, PEER_SERVER_PORT);

    httpServer.listen(PORT, () => {
      console.log(
        `💻 Running ${MONGO_URL ? "[online]" : "[offline]"} on ${SERVER_URL} @ ${SERVER_FPS}fps`,
      );
    });
  }
}

process.on("SIGINT", function () {
  process.exit();
});

process.once("SIGUSR2", function () {
  process.exit();
});

const server = new AppServer();

server.initialize();
