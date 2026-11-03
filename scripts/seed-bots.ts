/*
 * Creates bot accounts in the database MONGO_URL points at, and prints how a bot logs in.
 * Safe to rerun: accounts that already exist are left alone.
 *
 *   npm run seed:bots -- [count] [charClass]
 *
 * A bot logs in through the normal `login` command with the printed email and password
 * (or `tokenLogin` with the printed token). Nothing on the server treats bots specially.
 * Env: MONGO_URL (required), BOT_PASSWORD (default "botbot"), AUTH_SECRET (signs tokens).
 */
import { readConfig } from "../src/server/config/config";
import { createLoginToken } from "../src/server/auth/login-token";
import { createConsoleLogger } from "../src/server/log/logger";
import { initDatabase } from "../src/server/persistence/mongo";

const DEFAULT_COUNT = 5;
const DEFAULT_CLASS = "warrior";

async function main() {
  const [countArg, classArg] = process.argv.slice(2);
  const count = Number(countArg ?? DEFAULT_COUNT);
  if (!Number.isInteger(count) || count < 1) throw new Error(`Bad bot count: ${countArg}`);
  const charClass = classArg ?? DEFAULT_CLASS;
  const password = process.env.BOT_PASSWORD || "botbot";

  const config = readConfig(process.env);
  if (!config.mongoUrl) throw new Error("MONGO_URL is not set");
  const log = createConsoleLogger({ debug: false });
  const db = await initDatabase(config.mongoUrl, log);

  for (let n = 1; n <= count; n++) {
    const email = `bot${n}@bots.aether`;
    const existing = await db.getUserByEmail({ email });
    if (existing) {
      console.log(`${email}: exists`);
    } else {
      const created = await db.createUser({
        email,
        password,
        charClass,
        userName: `Bot${n}`,
        isBot: true,
      });
      if (!created) throw new Error(`Could not create ${email}`);
      console.log(`${email}: created`);
    }
    const stored = existing ?? (await db.getUserByEmail({ email }));
    const token = createLoginToken(email, stored?.password ?? "", Date.now(), config.authSecret);
    console.log(
      JSON.stringify({ login: { email, password: stored?.password ?? password }, token }),
    );
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
