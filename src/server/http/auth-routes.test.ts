import http from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initFakeDatabase } from "../persistence";
import { redeemPlayTicket } from "../auth/play-tickets";
import { registerAuthRoutes } from "./auth-routes";

let server: http.Server;
let url: string;

const post = (body: unknown) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeAll(async () => {
  const app = express();
  const db = await initFakeDatabase();
  db.getUserByLogin = async ({ email, password }) =>
    (email === "hero@aether.gg" && password === "secret" ? { email, password } : null) as Awaited<
      ReturnType<typeof db.getUserByLogin>
    >;
  registerAuthRoutes(app, db, () => 0);
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/auth/login`;
});
afterAll(() => {
  server.close();
});

describe("POST /auth/login", () => {
  const getTicket = async () => {
    const res = await post({ email: "hero@aether.gg", password: "secret" });
    return (await res.json()).ticket as string;
  };

  it("trades a good login for a ticket that works once", async () => {
    const ticket = await getTicket();
    expect(redeemPlayTicket(ticket, 1000)).toBe("hero@aether.gg");
    expect(redeemPlayTicket(ticket, 1000)).toBeNull();
  });

  it("gives tickets a short life", async () => {
    expect(redeemPlayTicket(await getTicket(), 61_000)).toBeNull();
  });

  it("refuses a wrong password", async () => {
    const res = await post({ email: "hero@aether.gg", password: "nope" });
    expect(res.status).toBe(401);
  });

  it("refuses a password that is a Mongo query", async () => {
    const res = await post({ email: "hero@aether.gg", password: { $ne: "" } });
    expect(res.status).toBe(400);
  });

  it("stops a script guessing passwords", async () => {
    const tries = Array.from({ length: 12 }, () =>
      post({ email: "hero@aether.gg", password: "guess" }),
    );
    const statuses = (await Promise.all(tries)).map(({ status }) => status);
    expect(statuses).toContain(429);
  });
});
