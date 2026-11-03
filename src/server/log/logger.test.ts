import { describe, expect, it } from "vitest";
import { createMemoryLogger } from "./logger";

describe("memory logger", () => {
  it("records entries by level in order", () => {
    const log = createMemoryLogger();
    log.info("hello", 1);
    log.error("bad");
    log.debug("detail");
    expect(log.entries.map((e) => e.level)).toEqual(["info", "error", "debug"]);
    expect(log.at("error")).toEqual([{ level: "error", args: ["bad"] }]);
    expect(log.at()).toHaveLength(3);
  });

  it("lets a test assert nothing went wrong", () => {
    const log = createMemoryLogger();
    log.warn("careful");
    expect(log.at("error")).toEqual([]);
  });
});
