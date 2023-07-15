import path from "path";
import { config } from "dotenv";
import game from "./game";

const express = require("express");
const app = express();
const http = require("http");
const httpServer = http.createServer(app);

config({ path: path.join(__dirname, "/../.env") });
game({ httpServer });

app.use(express.static(path.join(__dirname, "../public")));

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
