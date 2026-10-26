// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initFakeDatabase } from "../persistence";
import { GameServer } from "../game-server";

/** Party flows against the real game server with two connected clients. */
let httpServer: http.Server;
let gameServer: GameServer;
let url: string;
const sockets: Socket[] = [];

type Anything = any;

function once<T = Anything>(socket: Socket, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for "${event}"`)),
      timeoutMs,
    );
    socket.once(event, (arg: T) => {
      clearTimeout(timer);
      resolve(arg);
    });
  });
}

async function login(charClass = "warrior") {
  const socket = connect(url, { transports: ["websocket"], forceNew: true });
  sockets.push(socket);
  await once(socket, "connect");
  const heroInit = once(socket, "heroInit");
  socket.emit("demoLogin", { charClass });
  await heroInit;
  return socket;
}

const ping = (socket: Socket) =>
  new Promise<boolean>((resolve) => socket.emit("latency", () => resolve(true)));

/** Two logged-in players, `a` leading a party with `b` as a member. */
async function partyOfTwo() {
  const a = await login("warrior");
  const b = await login("mage");
  const aJoined = once(a, "partyUpdate");
  const invite = once(b, "partyInvite");
  a.emit("inviteToParty", b.id);
  await aJoined;
  const { partyId } = await invite;
  const aUpdate = once(a, "partyUpdate");
  const bUpdate = once(b, "partyUpdate");
  b.emit("partyAccept", partyId);
  return { a, b, partyId, aUpdate: await aUpdate, bUpdate: await bUpdate };
}

beforeAll(async () => {
  process.env.PUBLIC_DIR = "public";
  httpServer = http.createServer();
  gameServer = new GameServer({ httpServer, db: await initFakeDatabase() });
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
}, 60000);

afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  gameServer?.close();
});

describe("party", () => {
  it("inviting creates a party led by the inviter and sends the invite", async () => {
    const a = await login("warrior");
    const b = await login("mage");
    const created = once(a, "partyUpdate");
    const invite = once(b, "partyInvite");
    a.emit("inviteToParty", b.id);
    const update = await created;
    expect(update.message).toContain("has joined the party");
    expect(update.party.members).toEqual([expect.objectContaining({ id: a.id, isLeader: true })]);
    const received = await invite;
    expect(received.partyId).toBe(update.party.id);
    expect(received.inviter.socketId).toBe(a.id);
  });

  it("inviting an unknown player answers with an error", async () => {
    const a = await login("rogue");
    const error = once(a, "message");
    a.emit("inviteToParty", "nobody");
    expect(await error).toMatchObject({ type: "error", message: "Invalid player to invite." });
  });

  it("accepting adds the invitee and tells both members", async () => {
    const { a, b, aUpdate, bUpdate } = await partyOfTwo();
    for (const update of [aUpdate, bUpdate]) {
      expect(update.message).toContain("has joined the party");
      expect(update.party.members.map((m: Anything) => m.id)).toEqual([a.id, b.id]);
      expect(update.party.invitees).toEqual([]);
    }
  });

  it("accepting without an invite is refused", async () => {
    const a = await login("warrior");
    const b = await login("mage");
    const c = await login("cleric");
    const created = once(a, "partyUpdate");
    const invite = once(b, "partyInvite");
    a.emit("inviteToParty", b.id);
    await created;
    const { partyId } = await invite;
    const error = once(c, "message");
    c.emit("partyAccept", partyId);
    expect(await error).toMatchObject({
      type: "error",
      message: "You were not invited to this party.",
    });
  });

  it("leaving tells the leaver and hands leadership to the remaining member", async () => {
    const { a, b } = await partyOfTwo();
    const aLeft = once(a, "partyUpdate");
    const bUpdate = once(b, "partyUpdate");
    a.emit("partyLeave");
    expect(await aLeft).toEqual({ message: "You have left the party", party: null });
    const update = await bUpdate;
    expect(update.message).toContain("has left the party");
    expect(update.party.members).toEqual([expect.objectContaining({ id: b.id, isLeader: true })]);
  });

  it("disconnecting while in a party removes the member for the others", async () => {
    const { a, b } = await partyOfTwo();
    const bUpdate = once(b, "partyUpdate");
    a.disconnect();
    const update = await bUpdate;
    expect(update.message).toContain("has left the party");
    expect(update.party.members).toEqual([expect.objectContaining({ id: b.id, isLeader: true })]);
    expect(await ping(b)).toBe(true);
  });
});
