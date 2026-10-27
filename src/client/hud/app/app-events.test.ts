import { describe, expect, it } from "vitest";
import { latestHandlers } from "./app-events";

describe("latestHandlers", () => {
  it("calls the handler the ref holds when the event fires, not when it was bound", () => {
    const ref = { current: { onEvent: (n: number) => `first ${n}` } };
    const bound = latestHandlers(ref);
    ref.current = { onEvent: (n: number) => `second ${n}` };
    expect(bound.onEvent(1)).toBe("second 1");
  });
});
