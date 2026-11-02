import type { Scenario } from "../scenario";

/** Far enough that a straight walk from anywhere on a map runs into its edge. */
const OFF_MAP = -500;

export const collision: Scenario = {
  name: "collision",
  description: "bots walk on open ground, onto each other, into a wall, and try to teleport",
  async run({ spawn, log, check }) {
    const walker = await spawn("Bot Walker");
    const other = await spawn("Bot Other");

    const start = { x: walker.x, y: walker.y };
    log(`walker starts at ${Math.round(start.x)},${Math.round(start.y)} in ${walker.roomName}`);

    /* A short walk on open ground: find a free direction, since spawns can sit near walls */
    const steps = [
      [40, 0],
      [-40, 0],
      [0, 40],
      [0, -40],
    ];
    let from: { x: number; y: number } | undefined;
    for (const [dx, dy] of steps) {
      const here = { x: walker.x, y: walker.y };
      if (await walker.walkTo(here.x + dx, here.y + dy)) {
        from = here;
        break;
      }
    }
    check(!!from, "a short walk on open ground is accepted without corrections");

    /* Players don't block each other: the other bot walks the same open stretch onto the walker */
    if (from) {
      await other.cheat(`/tp ${Math.round(from.x)} ${Math.round(from.y)}`);
      const through = await other.walkTo(walker.x, walker.y);
      check(through, "a bot can walk onto another player's spot");
    }

    const before = walker.corrections.length;
    const reached = await walker.walkTo(OFF_MAP, walker.y, 30000);
    check(
      !reached && walker.corrections.length > before,
      "walking into a wall or the map edge is stopped",
    );
    check(walker.x >= 0, `the server keeps the walker on the map (x ${Math.round(walker.x)})`);

    const jumpFrom = { x: walker.x, y: walker.y };
    const corrected = walker.waitFor("positionCorrection");
    walker.socket.emit("playerInput", { x: walker.x + 800, y: walker.y, vx: 100, vy: 0 });
    const back = await corrected.catch(() => null);
    check(
      !!back && Math.hypot(back.x - jumpFrom.x, back.y - jumpFrom.y) < 1,
      "a teleport by input is refused and the walker is put back",
    );
  },
};
