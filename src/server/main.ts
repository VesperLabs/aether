import { createApp } from "./app/create-app";
import { readConfig } from "./config/config";
import { createConsoleLogger } from "./log/logger";
import { initDatabase } from "./persistence/mongo";
import { initFakeDatabase } from "./persistence/fake";

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
  const app = await createApp(config, { db, logger });

  /* Save everyone and close cleanly, so a deploy doesn't lose progress. */
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    logger.info("Shutting down: saving players");
    try {
      await app.close();
    } catch (error) {
      logger.error("Shutdown failed", error);
    }
    process.exit();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  if (config.peerPort !== null) logger.info(`💻 Peerserver @ /peerjs:${config.peerPort}`);
  logger.info(
    `💻 Running ${config.mongoUrl ? "[online]" : "[offline]"} on ${config.serverUrl} @ ${config.fps}fps`,
  );
}

process.once("SIGUSR2", function () {
  process.exit();
});

main();
