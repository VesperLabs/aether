import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSimServer, nextMessage, type SimServer } from "@/sim/sim-server";

describe("demo login over real sockets", () => {
  let sim: SimServer;
  beforeEach(async () => {
    sim = await createSimServer();
  });
  afterEach(async () => {
    await sim.close();
  });

  it("refuses to step ticks while nobody is logged in", async () => {
    await expect(sim.ticks(1)).rejects.toThrow(/paused/);
  });

  it("logs in, joins the world, and is removed on disconnect", async () => {
    const client = await sim.connect();
    const init = nextMessage(client, "heroInit");
    client.emit("demoLogin", { charClass: "warrior" });
    const [state, meta] = await init;

    expect(state.socketId).toBe(client.id);
    expect(meta?.isLogin).toBe(true);
    expect(sim.world.players[client.id!]).toBeDefined();
    expect(sim.world.loop.isRunning()).toBe(true);

    const tick = sim.world.tick;
    await sim.ticks(3);
    expect(sim.world.tick).toBe(tick + 3);

    const serverSocket = sim.world.io.sockets.sockets.get(client.id!)!;
    const gone = new Promise((resolve) => serverSocket.once("disconnect", resolve));
    const id = client.id!;
    client.disconnect();
    await gone;

    expect(sim.world.players[id]).toBeUndefined();
    expect(sim.world.loop.isRunning()).toBe(false);
  });

  it("shows each player to the other", async () => {
    const alice = await sim.connect();
    const aliceInit = nextMessage(alice, "heroInit");
    alice.emit("demoLogin", { charClass: "warrior" });
    await aliceInit;

    const bob = await sim.connect();
    const bobInit = nextMessage(bob, "heroInit");
    const aliceSeesBob = nextMessage(alice, "playerJoin");
    bob.emit("demoLogin", { charClass: "mage" });
    const [bobState] = await bobInit;
    const [joined] = await aliceSeesBob;

    expect(joined.socketId).toBe(bob.id);
    expect(bobState.players.map((p) => p.socketId)).toContain(alice.id);

    await sim.ticks(2);
    expect(Object.keys(sim.world.players).sort()).toEqual([alice.id, bob.id].sort());
  });
});
