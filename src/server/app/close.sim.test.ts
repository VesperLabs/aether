import { describe, expect, it, vi } from "vitest";
import { createSimServer, nextMessage } from "@/sim/sim-server";

describe("closing the server", () => {
  it("saves a connected player and waits for the write before resolving", async () => {
    const sim = await createSimServer({ seed: 2 });
    const socket = await sim.connect();
    const init = nextMessage(socket, "heroInit");
    socket.emit("demoLogin", { charClass: "warrior" });
    await init;

    const player = Object.values(sim.world.players)[0]!;
    player.gold = 4321;

    const finished: unknown[] = [];
    const write = vi.spyOn(sim.world.db, "updateUser").mockImplementation(async (saved) => {
      /* A slow write: close must not resolve before it lands. */
      await new Promise((resolve) => setTimeout(resolve, 50));
      finished.push((saved as { gold?: unknown }).gold);
    });

    await sim.close();

    expect(finished).toContain(4321);
    /* Closing saves each player once; the disconnects it causes do not save again. */
    expect(write).toHaveBeenCalledTimes(1);
    expect(sim.world.loop.isRunning()).toBe(false);
    expect(sim.log.at("error")).toEqual([]);
  });
});
