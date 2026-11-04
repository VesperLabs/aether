import http from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initFakeDatabase } from "../persistence";
import { createLookupLimit, registerCharacterLookup } from "./character-lookup";

let server: http.Server;
let url: string;

beforeAll(async () => {
  const app = express();
  registerCharacterLookup(app, await initFakeDatabase(), () => 0);
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/players/lookup`;
});
afterAll(() => {
  server.close();
});

describe("GET /players/lookup", () => {
  it("answers with the character's look and nothing about the account", async () => {
    const res = await fetch(`${url}?email=${encodeURIComponent("Hero@Aether.gg")}`);
    const { character } = await res.json();
    expect(character.charClass).toBe("rogue");
    expect(character.level).toBe(1);
    expect(character).not.toHaveProperty("email");
    expect(character).not.toHaveProperty("password");
  });

  it("refuses an email that is not a plain string", async () => {
    expect((await fetch(`${url}?email[$ne]=x`)).status).toBe(400);
    expect((await fetch(url)).status).toBe(400);
  });
});

describe("createLookupLimit", () => {
  it("allows up to the limit per key, then again in the next window", () => {
    const isAllowed = createLookupLimit(2, 1000);
    expect(isAllowed("a", 5000)).toBe(true);
    expect(isAllowed("a", 5001)).toBe(true);
    expect(isAllowed("a", 5002)).toBe(false);
    expect(isAllowed("b", 5002)).toBe(true);
    expect(isAllowed("a", 6000)).toBe(true);
  });
});
