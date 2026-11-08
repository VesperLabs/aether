import { describe, expect, it } from "vitest";
import { settleIntents } from "./settle";

describe("settleIntents", () => {
  it("keeps the highest priority intent of each channel", () => {
    const stop = { channel: "move", type: "stop" } as const;
    const respawn = { channel: "action", type: "respawn" } as const;
    const settled = settleIntents([
      { priority: 1, intent: stop },
      { priority: 5, intent: respawn },
      { priority: 2, intent: { ...stop } },
    ]);
    expect(settled).toHaveLength(2);
    expect(settled).toContainEqual(respawn);
  });

  it("keeps the first intent on a tie", () => {
    const first = { channel: "move", type: "stop" } as const;
    const settled = settleIntents([
      { priority: 1, intent: first },
      { priority: 1, intent: { ...first } },
    ]);
    expect(settled[0]).toBe(first);
  });
});
