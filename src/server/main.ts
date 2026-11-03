import { createApp } from "./app/create-app";
import { readConfig } from "./config/config";
import { createConsoleLogger } from "./log/logger";
import { initDatabase, initFakeDatabase } from "./persistence";

const config = readConfig(process.env);
const logger = createConsoleLogger({ debug: config.debug });

if (config.authSecretGenerated) {
  logger.warn("⚠️ AUTH_SECRET is not set: remembered logins end when the server restarts");
}

async function main() {
  // can run in offline mode. we don't connect to any DB or save anything.
  const db = config.mongoUrl
    ? await initDatabase(config.mongoUrl, logger)
    : await initFakeDatabase(logger);
  await createApp(config, { db, logger });
  if (config.peerPort !== null) logger.info(`💻 Peerserver @ /peerjs:${config.peerPort}`);
  logger.info(
    `💻 Running ${config.mongoUrl ? "[online]" : "[offline]"} on ${config.serverUrl} @ ${config.fps}fps`,
  );
}

process.on("SIGINT", function () {
  process.exit();
});

process.once("SIGUSR2", function () {
  process.exit();
});

main();
