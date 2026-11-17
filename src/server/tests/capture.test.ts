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
  const ball = ItemBuilder.buildItem(server.world.dice, "pokeball")!;
  ball.amount = amount;
  player.inventory = [ball];
  const crab = Object.values<Anything>(server.world.npcs).find(
    (npc) => npc.room.name === player.roomName && !npc.state.ownerId && !npc.state.isDead,
  );
  crab.x = player.x + 60;
  crab.y = player.y;
  crab.vx = crab.vy = 0;
  crab.behaviors = { guard: {} };
  /* Balls stop on the first foe they meet: everyone else (earlier tests' players, their
   * companions, creatures that broke free and wandered) goes out of the throw, behind it */
  const others = [
    ...Object.values<Anything>(server.world.players).filter((other) => other !== player),
    ...Object.values<Anything>(server.world.npcs).filter((npc) => npc !== crab),
  ];
  for (const other of others) other.x = player.x - 200;
  return { socket, player, ball, crab };
}

const companionsOf = (ownerId: string) =>
  Object.values<Anything>(server.world.npcs).filter((npc) => npc.state.ownerId === ownerId);

const isCapturing = (npc: Anything) =>
  npc.buffs.some((buff: Anything) => buff.name === "capturing");

/**
 * Throws the ball at the crab with the dice fixed to `roll`: it flies, the crab struggles in
 * `capturing`, and the world decides the catch when that runs out.
 */
async function throwAndSettle(socket: Anything, ballId: string, crab: Anything, roll: number) {
  const random = server.world.dice.random;
  server.world.dice.random = () => roll;
  socket.emit("throwItem", { location: "inventory", item: { id: ballId }, angle: 0 });
  await server.until(socket, () => isCapturing(crab));
  await server.until(socket, () => !isCapturing(crab));
  server.world.dice.random = random;
}

describe("pokeball", () => {
  it("uses up a ball and stamina, and catches the NPC it hits when the roll succeeds", async () => {
    const { socket, player, ball, crab } = await setUp(2);
    const sp = player.stats.sp;
    await throwAndSettle(socket, ball.id, crab, 0);

    expect(player.inventory[0].amount).toBe(1);
    expect(player.stats.sp).toBeLessThan(sp);
    expect(companionsOf(socket.id as string)[0].name).toBe(crab.name);
    expect(crab.state.isDead).toBe(true);
  });

  it("hurts nothing: a ball only puts its creature in the debuff", async () => {
    const { socket, ball, crab } = await setUp(1);
    const hp = crab.stats.hp;
    socket.emit("throwItem", { location: "inventory", item: { id: ball.id }, angle: 0 });
    await server.until(socket, () => isCapturing(crab));
    expect(crab.stats.hp).toBe(hp);
    await server.until(socket, () => !isCapturing(crab));
  });

  it("a creature left struggling where nobody is watching is let go", async () => {
    const { socket, ball, crab } = await setUp(1);
    const random = server.world.dice.random;
    server.world.dice.random = () => 0;
    socket.emit("throwItem", { location: "inventory", item: { id: ball.id }, angle: 0 });
    await server.until(socket, () => isCapturing(crab));
    /* Off to a room with nobody in it, as when everyone there leaves the game */
    const empty = Object.values<Anything>(server.world.rooms).find(
      (room) => room.name !== crab.room.name,
    );
    crab.room = empty;
    crab.roomName = empty.name;
    await server.run(socket, 100);
    server.world.dice.random = random;

    expect(isCapturing(crab)).toBe(false);
    expect(companionsOf(socket.id as string)).toHaveLength(0);
    expect(crab.state.isDead).toBeFalsy();
  });

  it("a failed roll uses up the ball, breaks free and leaves the NPC wild", async () => {
    const { socket, player, ball, crab } = await setUp(1);
    await throwAndSettle(socket, ball.id, crab, 0.99);

    expect(player.inventory[0]).toBeFalsy();
    expect(companionsOf(socket.id as string)).toHaveLength(0);
    expect(crab.state.isDead).toBeFalsy();
  });

  it("a flying ball is in the room state, for anyone walking in", async () => {
    const { socket, ball, crab } = await setUp(1);
    const started = once(socket, "effectStarted");
    socket.emit("throwItem", { location: "inventory", item: { id: ball.id }, angle: 0 });
    const [effect] = await started;
    expect(effect).toMatchObject({ kind: "spell", spellName: "pokeball" });

    const { roomName } = server.world.players[socket.id!];
    const { effects } = getRoomState(server.world, roomName!, socket.id!);
    expect(effects.some((e) => e.id === effect.id)).toBe(true);
    await server.until(socket, () => isCapturing(crab));
    await server.until(socket, () => !isCapturing(crab));
  });
});
