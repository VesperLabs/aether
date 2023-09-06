import path from "path";
import { config } from "dotenv";
import GameServer from "./GameServer";
import { initDatabase } from "./db";
import { initFakeDatabase } from "./db/fake";
import { calculateStats, getFullCharacterState } from "./utils";

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

  app.use(express.static(path.join(__dirname, process.env.PUBLIC_DIR)));

  // app.get("/metrics/players", (req, res) => {
  //   const scene = aetherServer?.game?.scene?.scenes?.[0] as ServerScene;
  //   const { players } = scene ?? {};
  //   const playerStates = Object.values(players).map(getFullCharacterState);
  //   res.json(playerStates);
  // });

  app.get("/keepers/all", (req, res) => {
    const scene = aetherServer?.game?.scene?.scenes?.[0] as ServerScene;
    const { npcs } = scene ?? {};
    const keeperStates = Object.values(npcs)
      ?.filter((n) => n?.kind === "keeper" && n?.profile?.race === "human")
      .map(getFullCharacterState);
    res.json(keeperStates);
  });

  app.get("/players/prune", async (req, res) => {
    await db.pruneNoobs();
    res.json({ string: "ok" });
  });

  app.get("/players/all", async (req, res) => {
    const sortBy = req?.query?.sortBy || "updatedAt";
    const players = await db.getAllUsers({ sortBy });
    let ret = [];
    for (const player of players) {
      calculateStats(player, false);
      ret.push({
        id: player?._id,
        charClass: player?.charClass,
        stats: player?.stats,
        state: player?.state,
        abilities: player?.abilities,
        equipment: player?.equipment,
        inventory: player?.inventory,
        activeItemSlots: player?.activeItemSlots,
        profile: player?.profile,
        updatedAt: player?.updatedAt,
        quests: player?.quests,
      });
    }
    res.json(ret);
  });

  app.get("/metrics", async (req, res) => {
    const scene = aetherServer?.game?.scene?.scenes?.[0] as ServerScene;
    const totalPlayers = await db.countAllUsers();
    const { players, npcs, loots, doors } = scene ?? {};

    const endTime = Date.now();
    const clientTimestamp = req?.query?.timestamp
      ? parseInt(req?.query?.timestamp as string, 10)
      : endTime;

    const metrics: ServerMetrics = {
      playersOnline: Object.keys(players).length,
      totalPlayers: totalPlayers ?? 0,
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
