import path from "path";
import { config } from "dotenv";
import GameServer from "./GameServer";
//import { getFullCharacterState } from "./utils";

config({ path: path.join(__dirname, "/../.env") });
const cors = require("cors");
const express = require("express");
const app = express();
const http = require("http");
const httpServer = http.createServer(app);
const aetherServer = new GameServer({ httpServer });
app.use(
  cors({
    origin: "*", // Replace with your allowed origin
  })
);

app.use(express.static(path.join(__dirname, "../public")));

// app.get("/players/all", (req, res) => {
//   const scene = game.game.scene.scenes?.[0] as ServerScene;
//   const { players } = scene ?? {};
//   const playerStates = Object.values(players).map(getFullCharacterState);
//   res.json(playerStates);
// });

app.get("/metrics", (req, res) => {
  const scene = aetherServer?.game?.scene?.scenes?.[0] as ServerScene;
  const { players, npcs, loots, doors } = scene ?? {};
  const metrics: ServerMetrics = {
    playersOnline: Object.keys(players).length,
    npcsLoaded: Object.keys(npcs).length,
    doorsLoaded: Object.keys(doors).length,
    lootsOnGround: Object.keys(loots).length,
    serverSpawnTime: aetherServer?.spawnTime,
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

process.on("SIGINT", function () {
  process.exit();
});

process.once("SIGUSR2", function () {
  process.exit();
});
