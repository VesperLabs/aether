import { describe, expect, it, vi } from "vitest";
import { createTickLoop } from "@/rules/world";
import { createMemoryLogger } from "@/server/log/logger";
import { readConfig } from "@/server/config/config";
import { createBaseUser } from "@/server/persistence/base-user";
import { initFakeDatabase } from "@/server/persistence/fake";
import { createServerDice } from "@/server/world/server-dice";
import { createServerWorld } from "@/server/world/game-world";
import type { CommandContext } from "@/server/net/command-context";
import type { GameIo } from "@/network/socket/game-socket";
import { enterWorld } from "./enter-world";

async function setup() {
  const log = createMemoryLogger();
  const dice = createServerDice(1);
  const disconnect = vi.fn();
  const io = {
    emit: vi.fn(),
    sockets: { sockets: new Map([["old", { disconnect }]]) },
  } as unknown as GameIo;
  const world = createServerWorld({
    io,
    db: await initFakeDatabase(log, dice),
    config: readConfig({ PUBLIC_DIR: "public" }),
    logger: log,
    dice,
    mapNpcs: false,
  });
  world.loop = createTickLoop(world, [], { fps: 1 });
  const connect = (socketId: string) => {
    const emit = vi.fn();
    const ctx = {
      world,
      io,
      socketId,
      session: { peerId: null },
      socket: { id: socketId, emit, join: vi.fn(), to: () => ({ emit: vi.fn() }) },
    } as unknown as CommandContext;
    return { ctx, emit };
  };
  return { world, connect, io, disconnect, dice };
}

describe("enterWorld", () => {
  it("creates the player, resumes the loop and sends heroInit", async () => {
    const { world, connect, dice } = await setup();
    const { ctx, emit } = connect("a");
    enterWorld(ctx, { email: "a@x.io", ...createBaseUser(dice, "rogue") });
    expect(world.players.a?.email).toBe("a@x.io");
    expect(world.loop.isRunning()).toBe(true);
    expect(emit).toHaveBeenCalledWith("heroInit", expect.anything(), { isLogin: true });
  });

  it("ignores a socket that is already in the world", async () => {
    const { world, connect, dice } = await setup();
    const { ctx, emit } = connect("a");
    enterWorld(ctx, { email: "a@x.io", ...createBaseUser(dice, "rogue") });
    emit.mockClear();
    enterWorld(ctx, { email: "a@x.io", ...createBaseUser(dice, "rogue") });
    expect(emit).not.toHaveBeenCalled();
    expect(Object.keys(world.players)).toEqual(["a"]);
  });

  it("kicks an older connection on the same email", async () => {
    const { world, connect, dice, io, disconnect } = await setup();
    const user = { email: "a@x.io", ...createBaseUser(dice, "rogue") };
    enterWorld(connect("old").ctx, user);
    enterWorld(connect("new").ctx, user);
    expect(Object.keys(world.players)).toEqual(["new"]);
    expect(disconnect).toHaveBeenCalledWith(true);
    expect(io.emit).toHaveBeenCalledWith("remove", "old");
  });

  it("marks demo players and never kicks other demo players", async () => {
    const { world, connect, dice } = await setup();
    enterWorld(connect("a").ctx, createBaseUser(dice, "rogue"), { isDemo: true });
    enterWorld(connect("b").ctx, createBaseUser(dice, "rogue"), { isDemo: true });
    expect(Object.keys(world.players).sort()).toEqual(["a", "b"]);
    expect(world.players.a?.isDemoAccount).toBe(true);
  });

  it("carries isBot onto the profile", async () => {
    const { world, connect, dice } = await setup();
    enterWorld(connect("a").ctx, { email: "b@x.io", isBot: true, ...createBaseUser(dice) });
    expect(world.players.a?.profile.isBot).toBe(true);
  });
});
