import { afterEach, describe, expect, it } from "vitest";
import type { ClientGameSocket } from "@/network/socket/game-socket";
import { createSimServer, nextMessage, type SimServer } from "@/sim/sim-server";
import { createMapLoader, DEFAULT_PUBLIC_DIR } from "../maps/load-map";
import { connectBot } from "../net/connect";
import { fetchHumansOnline } from "../net/humans-online";
import { createAmbientRunner, type AmbientRunner } from "./runner";

const GRACE_MS = 2000;

/** Waits until every socket's hero is in, then flags it as a bot, as a seeded bot account would be. */
async function markBots(sim: SimServer, sockets: ClientGameSocket[]) {
  await Promise.all(sockets.map((s) => nextMessage(s, "heroInit")));
  for (const s of sockets) sim.world.players[s.id!]!.profile.isBot = true;
}

describe("ambient bots on a sim server", () => {
  let sim: SimServer;
  let runner: AmbientRunner | undefined;
  afterEach(async () => {
    runner?.stop();
    await sim?.close();
  });

  it("join when a human logs in and leave after the grace period once they go", async () => {
    sim = await createSimServer({ seed: 7 });
    const sockets: ClientGameSocket[] = [];
    runner = createAmbientRunner({
      count: 2,
      graceMs: GRACE_MS,
      pollMs: 500,
      seed: 7,
      clock: sim.clock,
      fetchHumans: () => fetchHumansOnline(sim.url),
      connect: () => {
        const socket = connectBot(sim.url, { kind: "demo", charClass: "warrior" }, () => {});
        sockets.push(socket);
        return socket;
      },
      loadMap: createMapLoader(DEFAULT_PUBLIC_DIR),
      log: () => {},
    });

    await runner.poll();
    expect(runner.bots).toHaveLength(0);

    const human = await sim.connect();
    const init = nextMessage(human, "heroInit");
    human.emit("demoLogin", { charClass: "warrior" });
    await init;
    await runner.poll();
    expect(runner.bots).toHaveLength(2);
    await markBots(sim, sockets);
    expect(Object.keys(sim.world.players)).toHaveLength(3);

    const gone = nextMessage(sockets[0]!, "remove");
    human.disconnect();
    await gone;
    await runner.poll();
    expect(runner.bots).toHaveLength(2);

    await sim.clock.advance(GRACE_MS);
    await runner.poll();
    expect(runner.bots).toHaveLength(0);
    expect(sockets.every((s) => s.disconnected)).toBe(true);
  });
});
