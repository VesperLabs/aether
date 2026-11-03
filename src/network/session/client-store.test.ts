import { describe, expect, it, vi } from "vitest";
import { CHAT_LIMIT } from "./client-state";
import { createClientStore } from "./client-store";

describe("client store", () => {
  it("stamps server and local chat and tells listeners", () => {
    const store = createClientStore(() => 42);
    const listener = vi.fn();
    const stop = store.subscribe(listener);
    store.apply("message", { type: "chat", message: "hi" });
    store.addLocalChat({ type: "success", message: "You are now level 2!" });
    expect(store.state.chat).toEqual([
      { type: "chat", message: "hi", timestamp: 42 },
      { type: "success", message: "You are now level 2!", timestamp: 42 },
    ]);
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
    store.reset();
    expect(store.state.chat).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("forgets the party and characters on reset, with a new revision", () => {
    const store = createClientStore(() => 0);
    store.apply("partyUpdate", { party: { id: "p" } });
    const revision = store.state.revision;
    store.reset();
    expect(store.state.party).toBeNull();
    expect(store.state.players.size).toBe(0);
    expect(store.state.revision).toBeGreaterThan(revision);
  });

  it("replaces the chat array on change and keeps it bounded", () => {
    const store = createClientStore(() => 0);
    const before = store.state.chat;
    for (let i = 0; i < CHAT_LIMIT + 3; i++) store.addLocalChat({ type: "info", message: `${i}` });
    expect(store.state.chat).not.toBe(before);
    expect(store.state.chat).toHaveLength(CHAT_LIMIT);
  });
});
