// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ItemBuilder } from "@/content";
import { getRoomState } from "@/server/net/room-sync";
import { once, startTestServer, type TestServer } from "./test-server";

/** Throwing a pokeball at a wild NPC, against the real game server. */
let server: TestServer;

type Anything = any;

beforeAll(async () => {
  server = await startTestServer();
}, 60000);

afterAll(() => server?.close());

/** Logs in holding `amount` pokeballs, with a wild crab right in front of them. */
async function setUp(amount: number) {
  const { socket, player } = await server.login();
  const ball = ItemBuilder.buildItem(server.world.dice, "stackable", "common", "pokeball")!;
  ball.amount = amount;
  player.inventory = [ball];
  const crab = Object.values<Anything>(server.world.npcs).find(
    (npc) => npc.room.name === player.roomName && !npc.state.ownerId && !npc.state.isDead,
  );
  crab.x = player.x + 60;
  crab.y = player.y;
  crab.vx = crab.vy = 0;
  crab.state.isStatic = true;
  return { socket, player, ball, crab };
}

const companionsOf = (ownerId: string) =>
  Object.values<Anything>(server.world.npcs).filter((npc) => npc.state.ownerId === ownerId);

/** Throws the ball at the crab with the dice fixed to `roll`, and waits for the world to decide it. */
async function throwAndSettle(socket: Anything, ballId: string, roll: number) {
  const random = server.world.dice.random;
  server.world.dice.random = () => roll;
  const ended = once(socket, "effectEnded");
  socket.emit("throwItem", { location: "inventory", item: { id: ballId }, angle: 0 });
  /* The throw is in once the server has read it */
  await server.run(socket, 0);
  expect(Object.keys(server.world.balls)).toHaveLength(1);
  await server.until(socket, () => Object.keys(server.world.balls).length === 0);
  server.world.dice.random = random;
  return (await ended)[0];
}

describe("pokeball", () => {
  it("uses up a ball and stamina, and catches the NPC it hits when the roll succeeds", async () => {
    const { socket, player, ball, crab } = await setUp(2);
    const sp = player.stats.sp;
    const ended = await throwAndSettle(socket, ball.id, 0);

    expect(ended.outcome).toBe("caught");
    expect(player.inventory[0].amount).toBe(1);
    expect(player.stats.sp).toBeLessThan(sp);
    expect(companionsOf(socket.id as string)[0].name).toBe(crab.name);
    expect(crab.state.isDead).toBe(true);
  });

  it("a failed roll uses up the ball, breaks free and leaves the NPC wild", async () => {
    const { socket, player, ball, crab } = await setUp(1);
    const ended = await throwAndSettle(socket, ball.id, 0.99);

    expect(ended.outcome).toBe("broke");
    expect(player.inventory[0]).toBeFalsy();
    expect(companionsOf(socket.id as string)).toHaveLength(0);
    expect(crab.state.isDead).toBeFalsy();
  });

  it("a struggling ball is in the room state, for anyone walking in", async () => {
    const { socket, ball } = await setUp(1);
    const started = once(socket, "effectStarted");
    socket.emit("throwItem", { location: "inventory", item: { id: ball.id }, angle: 0 });
    const [effect] = await started;
    await server.run(socket, 500);

    const { effects } = getRoomState(server.world, server.world.players[socket.id!].roomName!);
    const shown = effects.find((e) => e.id === effect.id);
    expect(shown).toMatchObject({ kind: "ball", targetId: effect.targetId });
    expect(shown!.ageMs).toBeGreaterThanOrEqual(500);
    await server.until(socket, () => Object.keys(server.world.balls).length === 0);
  });
});
