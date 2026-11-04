// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { once, replies, startTestServer, type TestServer } from "./test-server";

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});
afterAll(() => server.close());

describe("observing a room", () => {
  it("sends the room and keeps the world running, with no character", async () => {
    const socket = await server.connect();
    const observed = once(socket, "roomObserved");
    socket.emit("observe", { roomName: "town" });
    const [room] = (await observed) as [{ roomName: string; npcs: unknown[] }];

    expect(room.roomName).toBe("town");
    expect(room.npcs.length).toBeGreaterThan(0);
    expect(server.world.players[socket.id!]).toBeUndefined();
    expect(server.world.observers.has(socket.id)).toBe(true);
    expect(server.world.loop.isRunning()).toBe(true);
    socket.disconnect();
  });

  it("wakes the npcs of the room it watches", async () => {
    const socket = await server.connect();
    const observed = once(socket, "roomObserved");
    socket.emit("observe", { roomName: "town" });
    await observed;
    const npc = Object.values<any>(server.world.npcs).find((n) => n.room.name === "town");
    npc.stats.hp = 1;
    await server.run(socket, 100);

    /* A room nobody watches heals its npcs to full every tick */
    expect(npc.stats.hp).toBeLessThan(npc.stats.maxHp);
    socket.disconnect();
  });

  it("ignores rooms that do not exist", async () => {
    const socket = await server.connect();
    const answered = await replies(socket, "roomObserved", () =>
      socket.emit("observe", { roomName: "nowhere" }),
    );
    expect(answered).toBe(false);
    socket.disconnect();
  });

  it("stops watching on login, and a player cannot observe", async () => {
    const socket = await server.connect();
    const observed = once(socket, "roomObserved");
    socket.emit("observe", { roomName: "mine" });
    await observed;
    const heroInit = once(socket, "heroInit");
    socket.emit("demoLogin", { charClass: "warrior" });
    await heroInit;

    expect(server.world.observers.has(socket.id)).toBe(false);
    const answered = await replies(socket, "roomObserved", () =>
      socket.emit("observe", { roomName: "town" }),
    );
    expect(answered).toBe(false);
    socket.disconnect();
  });

  it("hears nothing private: no chat, and players without what they own", async () => {
    const { socket: heroSocket, player } = await server.login();
    player.gold = 500;
    const socket = await server.connect();
    const observed = once(socket, "roomObserved");
    socket.emit("observe", { roomName: player.roomName });
    const [room] = (await observed) as [{ players: any[] }];
    const seen = room.players.find((p) => p.id === player.id);
    expect(seen.gold).toBe(0);
    expect(seen.inventory).toEqual([]);
    expect(seen.peerId).toBeUndefined();

    const chat = await replies(socket, "message", () =>
      heroSocket.emit("message", { message: "secret" }),
    );
    expect(chat).toBe(false);

    const update = once(socket, "playerUpdate");
    server.world.players[player.id].profile.userName = "Renamed";
    heroSocket.emit("updateProfile", {});
    const [updated] = (await update) as [any];
    expect(updated.gold).toBe(0);
    socket.disconnect();
    heroSocket.disconnect();
  });

  it("limits how fast a connection can change rooms", async () => {
    const socket = await server.connect();
    const observed = once(socket, "roomObserved");
    socket.emit("observe", { roomName: "town" });
    await observed;
    const answered = await replies(socket, "roomObserved", () =>
      socket.emit("observe", { roomName: "mine" }),
    );
    expect(answered).toBe(false);
    socket.disconnect();
  });
});
