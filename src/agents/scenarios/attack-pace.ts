import type { Scenario } from "./scenario";

const SPAM_MS = 1000;
const SPAM_EVERY_MS = 25;

export const attackPace: Scenario = {
  name: "attack-pace",
  description: "spamming attack only shows real swings; a paced agent never swings early",
  async run({ spawn, clock, log, check }) {
    const attacker = await spawn("Agent Swinger");
    const watcher = await spawn("Agent Watcher");
    await watcher.cheat(`/tp ${Math.round(attacker.senses.x)} ${Math.round(attacker.senses.y)}`);
    await attacker.cheat("/heal");

    let seen = 0;
    const stop = watcher.waitFor(
      "playerAttack",
      (a) => (a.socketId === attacker.id && seen++, false),
    );
    stop.catch(() => {});

    const delay = attacker.senses.hero?.stats?.attackDelay ?? 0;
    const target = { x: attacker.senses.x + 30, y: attacker.senses.y };
    for (let t = 0; t < SPAM_MS; t += SPAM_EVERY_MS) {
      attacker.swingAt(target.x, target.y);
      await clock.sleep(SPAM_EVERY_MS);
    }
    await watcher.sync();
    const allowed = Math.floor(SPAM_MS / delay) + 1;
    log(`${SPAM_MS / SPAM_EVERY_MS} attacks sent, ${seen} shown (attack delay ${delay}ms)`);
    check(seen >= 1 && seen <= allowed, `others only see real swings (at most ${allowed})`);

    /* The agent can't know when its last spammed swing landed, so let that cooldown run out */
    await clock.sleep(delay);
    await attacker.cheat("/heal");
    const before = seen;
    for (let i = 0; i < 3; i++) await attacker.attackToward(target.x, target.y);
    await attacker.sync();
    await watcher.sync();
    check(seen - before === 3, `every paced swing lands (${seen - before} of 3)`);
  },
};
