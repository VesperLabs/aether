// @vitest-environment node
import type { Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { once, replies, startTestServer, type TestServer } from "./test-server";

/** Player chat commands against the real game server, with cheats off. */
let server: TestServer;

async function joinAs(name: string) {
  const { socket, player } = await server.login();
  player.profile.userName = name;
  return { socket, player };
}

/** Sends a line of chat and resolves with the first message `listener` gets back. */
async function send(from: Socket, line: string, listener = from) {
  const reply = once(listener, "message");
  from.emit("message", { message: line });
  const [message] = await reply;
  return message;
}

beforeAll(async () => {
  delete process.env.ENABLE_CHEATS;
  server = await startTestServer();
}, 60000);

afterAll(() => server?.close());

describe("player chat commands", () => {
  it("/w whispers one player by shortcut, and /r answers", async () => {
    const ann = await joinAs("Ann Lee");
    const bob = await joinAs("Bob");
    const received = await send(ann.socket, "/w ann lee hi", ann.socket);
    expect(received).toMatchObject({ type: "error" });

    const echo = once(ann.socket, "message");
    const bobGot = await send(ann.socket, "/w Bob hello there", bob.socket);
    expect((await echo)[0]).toMatchObject({ type: "whisper", to: "Bob" });
    expect(bobGot).toMatchObject({ type: "whisper", from: "Ann Lee", message: "hello there" });

    const annGot = await send(bob.socket, "/r hey", ann.socket);
    expect(annGot).toMatchObject({ type: "whisper", from: "Bob", message: "hey" });
  });

  it("keeps a whisper from everyone else", async () => {
    const ann = await joinAs("Ann2");
    await joinAs("Bob2");
    const eve = await joinAs("Eve2");
    const heard = await replies(eve.socket, "message", () =>
      ann.socket.emit("message", { message: "/w Bob2 secret" }),
    );
    expect(heard).toBe(false);
  });

  it("refuses /party outside a party and /reply with nobody to answer", async () => {
    const { socket } = await joinAs("Solo");
    expect(await send(socket, "/party hi")).toMatchObject({ type: "error" });
    expect(await send(socket, "/r hi")).toMatchObject({ type: "error" });
  });

  it("/me, /who and /roll answer with cheats off", async () => {
    const { socket } = await joinAs("Actor");
    expect(await send(socket, "/me waves")).toMatchObject({
      type: "emote",
      message: "Actor waves",
    });
    expect((await send(socket, "/who")).message).toContain("Actor");
    expect((await send(socket, "/roll 6")).message).toMatch(/^Actor rolls [1-6] \(1-6\)$/);
  });

  it("links only the sender's own items, sent through whispers too", async () => {
    const ann = await joinAs("Linker");
    const bob = await joinAs("Friend");
    ann.player.inventory = [{ id: "blade", key: "foxBlade", name: "Fox Blade", rarity: "rare" }];

    const link = (message: string, items: string[]) => {
      const heard = once(bob.socket, "message");
      ann.socket.emit("message", { message, items });
      return heard.then(([line]) => line);
    };
    const owned = await link("wts [Fox Blade]", ["blade"]);
    expect(owned.links).toMatchObject([{ id: "blade", rarity: "rare" }]);
    expect((await link("/w Friend [Fox Blade]", ["blade"])).links).toHaveLength(1);
    expect((await link("wts [Fox Blade]", ["not-mine"])).links).toBeUndefined();
    expect((await link("no name here", ["blade"])).links).toBeUndefined();
  });

  it("leaves cheats as plain chat", async () => {
    const { socket } = await joinAs("Cheater");
    expect(await send(socket, "/heal")).toMatchObject({ type: "chat", message: "/heal" });
  });
});
