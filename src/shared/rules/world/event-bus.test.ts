import { describe, expect, it, vi } from "vitest";
import { createEventBus } from "./event-bus";

interface TestEvents {
  ping: { n: number };
  pong: { text: string };
}

describe("event bus", () => {
  it("delivers payloads to handlers of that event only", () => {
    const bus = createEventBus<TestEvents>();
    const ping = vi.fn();
    const pong = vi.fn();
    bus.on("ping", ping);
    bus.on("pong", pong);
    bus.emit("ping", { n: 1 });
    expect(ping).toHaveBeenCalledWith({ n: 1 });
    expect(pong).not.toHaveBeenCalled();
  });

  it("calls handlers in subscription order", () => {
    const bus = createEventBus<TestEvents>();
    const calls: string[] = [];
    bus.on("ping", () => calls.push("a"));
    bus.on("ping", () => calls.push("b"));
    bus.emit("ping", { n: 0 });
    expect(calls).toEqual(["a", "b"]);
  });

  it("does nothing when nobody listens", () => {
    const bus = createEventBus<TestEvents>();
    expect(() => bus.emit("ping", { n: 0 })).not.toThrow();
  });

  it("off removes a handler", () => {
    const bus = createEventBus<TestEvents>();
    const handler = vi.fn();
    bus.on("ping", handler);
    bus.off("ping", handler);
    bus.emit("ping", { n: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it("on returns an unsubscribe function", () => {
    const bus = createEventBus<TestEvents>();
    const handler = vi.fn();
    const unsubscribe = bus.on("ping", handler);
    bus.emit("ping", { n: 1 });
    unsubscribe();
    bus.emit("ping", { n: 2 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("subscribing the same handler twice calls it once", () => {
    const bus = createEventBus<TestEvents>();
    const handler = vi.fn();
    bus.on("ping", handler);
    bus.on("ping", handler);
    bus.emit("ping", { n: 1 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("lets a handler unsubscribe itself or another during emit", () => {
    const bus = createEventBus<TestEvents>();
    const later = vi.fn();
    const off = bus.on("ping", () => {
      off();
      bus.off("ping", later);
    });
    bus.on("ping", later);
    bus.emit("ping", { n: 1 });
    bus.emit("ping", { n: 2 });
    expect(later).not.toHaveBeenCalled();
  });

  it("keeps separate buses independent", () => {
    const a = createEventBus<TestEvents>();
    const b = createEventBus<TestEvents>();
    const handler = vi.fn();
    a.on("ping", handler);
    b.emit("ping", { n: 1 });
    expect(handler).not.toHaveBeenCalled();
  });
});
