import { afterEach, describe, expect, it } from "vitest";
import { createBot } from "@/bots/bot";
import { grind } from "@/bots/brains/grind";
import { createMapLoader, DEFAULT_PUBLIC_DIR } from "@/bots/maps/load-map";
import { createRng } from "@/rules/world/rng";
import { createSimServer, nextMessage, type SimServer } from "@/sim/sim-server";

describe("a grind bot against the real server", () => {
  let sim: SimServer;
  afterEach(async () => {
    await sim?.close();
  });

  it("walks up to npcs, damages them and is credited with a kill", async () => {
    sim = await createSimServer({ seed: 2, mode: "turbo" });
    const socket = await sim.connect();
    const bot = createBot({
      socket,
      clock: sim.clock,
      loadMap: createMapLoader(DEFAULT_PUBLIC_DIR),
      brain: grind,
      rng: createRng(2),
    });
    const init = nextMessage(socket, "heroInit");
    socket.emit("demoLogin", { charClass: "warrior" });
    await init;
    const id = bot.clientState.selfId;

    /* Start beside the nearest npc so the kill takes seconds, not a walk across the map. */
    const player = sim.world.players[id]!;
    const npc = Object.values(sim.world.npcs)
      .filter((n) => n.room.name === player.roomName)
      .sort(
        (a, b) =>
          Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y),
      )[0]!;
    player.x = npc.x - 40;
    player.y = npc.y;

    let damageDealt = 0;
    const kills: string[] = [];
    sim.world.events.on("characterDamaged", ({ attackerSocketId, amount }) => {
      if (attackerSocketId === id) damageDealt += amount;
    });
    sim.world.events.on("mobKilled", ({ recipientIds, mobId }) => {
      if (recipientIds.includes(id)) kills.push(mobId);
    });

    const stop = bot.run(sim.clock.interval);
    await sim.clock.advance(20 * 1000);
    stop();

    expect(damageDealt).toBeGreaterThan(0);
    expect(kills.length).toBeGreaterThan(0);
    expect(sim.log.at("error")).toEqual([]);
  });
});
