import { describe, expect, it } from "vitest";
import { readAmbientConfig } from "./config";

describe("readAmbientConfig", () => {
  it("defaults to 3 bots with the dev password outside production", () => {
    expect(readAmbientConfig({})).toMatchObject({ count: 3, password: "botbot", port: 8000 });
  });

  it("refuses to run in production without BOT_PASSWORD", () => {
    expect(() => readAmbientConfig({ NODE_ENV: "production" })).toThrow(/BOT_PASSWORD/);
  });

  it("needs no password when disabled", () => {
    expect(readAmbientConfig({ NODE_ENV: "production", AMBIENT_BOTS: "0" }).count).toBe(0);
  });

  it("rejects a bad count", () => {
    expect(() => readAmbientConfig({ AMBIENT_BOTS: "lots" })).toThrow(/AMBIENT_BOTS/);
  });
});
