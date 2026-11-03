import { createApp } from "./app/create-app";
import { readConfig } from "./config/config";
import { initDatabase, initFakeDatabase } from "./persistence";

const config = readConfig(process.env);

if (config.authSecretGenerated) {
  console.warn("⚠️ AUTH_SECRET is not set: remembered logins end when the server restarts");
}

async function main() {
  // can run in offline mode. we don't connect to any DB or save anything.
  const db = config.mongoUrl ? await initDatabase(config.mongoUrl) : await initFakeDatabase();
  await createApp(config, { db });
  if (config.peerPort !== null) console.log(`💻 Peerserver @ /peerjs:${config.peerPort}`);
  console.log(
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
