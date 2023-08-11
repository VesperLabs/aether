import path from "path";
import { config } from "dotenv";
import GameServer from "./GameServer";
import { initDatabase } from "./db";
import { initFakeDatabase } from "./db/fake";
import ServerCharacter from "./Character";

config({ path: path.join(__dirname, "/../.env") });
const cors = require("cors");
const express = require("express");
const app = express();
const http = require("http");
const httpServer = http.createServer(app);

async function initialize() {
  // can run in offline mode. we don't connect to any DB or save anything.
  const db = process.env.MONGO_URL
    ? await initDatabase(process.env.MONGO_URL)
    : await initFakeDatabase();

  const aetherServer = new GameServer({ httpServer, db });

  app.use(
    cors({
      origin: "*", // Replace with your allowed origin
    })
  );

  app.use(express.static(path.join(__dirname, "../public")));

  // app.get("/metrics/players", (req, res) => {
  //   const scene = aetherServer?.game?.scene?.scenes?.[0] as ServerScene;
  //   const { players } = scene ?? {};
  //   const playerStates = Object.values(players).map(getFullCharacterState);
  //   res.json(playerStates);
  // });

  app.get("/players/all", async (req, res) => {
    const sortBy = req?.query?.sortBy || "updatedAt";
    //await db.pruneNoobs();
    const players = await db.getAllUsers({ sortBy });
    let ret = [];
    for (const player of players) {
      ret.push({
        id: player?._id,
        charClass: player?.charClass,
        stats: player?.baseStats,
        equipment: player?.equipment,
        activeItemSlots: player?.activeItemSlots,
        profile: player?.profile,
        updatedAt: player?.updatedAt,
        quests: player?.quests,
      });
    }
    res.json(ret);
  });

  app.get("/metrics", (req, res) => {
    const scene = aetherServer?.game?.scene?.scenes?.[0] as ServerScene;
    const { players, npcs, loots, doors } = scene ?? {};

    const endTime = Date.now();
    const clientTimestamp = req?.query?.timestamp
      ? parseInt(req?.query?.timestamp as string, 10)
      : endTime;

    const metrics: ServerMetrics = {
      playersOnline: Object.keys(players).length,
      npcsLoaded: Object.keys(npcs).length,
      doorsLoaded: Object.keys(doors).length,
      lootsOnGround: Object.keys(loots).length,
      serverSpawnTime: aetherServer?.spawnTime,
      ping: endTime - clientTimestamp,
      upTime: aetherServer?.getUptime(),
    };
    res.json(metrics);
  });

  httpServer.listen(process.env.PORT, () => {
    console.log(
      `💻 Running ${process.env.MONGO_URL ? "[online]" : "[offline]"} on ${
        process.env.SERVER_URL
      } @ ${process.env.SERVER_FPS}fps`
    );
  });
}

process.on("SIGINT", function () {
  process.exit();
});

process.once("SIGUSR2", function () {
  process.exit();
});

initialize();
