import { describe, expect, it } from "vitest";
import { DEFAULT_SERVER_FPS } from "@/network/sync/timing";
import { readConfig } from "./config";

describe("readConfig", () => {
  it("has development defaults for an empty environment", () => {
    const config = readConfig({});
    expect(config).toMatchObject({
      port: undefined,
      peerPort: null,
      mongoUrl: null,
      fps: DEFAULT_SERVER_FPS,
      publicDir: "public",
      isProduction: false,
      allowDemo: true,
      cheats: false,
      debug: false,
      authSecretGenerated: false,
    });
    expect(config.authSecret).toBe("aether-dev-auth-secret");
  });

  it("reads ports, urls, fps and folders", () => {
    const config = readConfig({
      PORT: "8080",
      PEER_SERVER_PORT: "9000",
      MONGO_URL: "mongodb://x",
      SERVER_URL: "http://localhost:8080",
      SERVER_FPS: "30",
      PUBLIC_DIR: "dist",
    });
    expect(config).toMatchObject({
      port: "8080",
      peerPort: 9000,
      mongoUrl: "mongodb://x",
      serverUrl: "http://localhost:8080",
      fps: 30,
      publicDir: "dist",
    });
  });

  it("falls back to the default fps for nonsense", () => {
    expect(readConfig({ SERVER_FPS: "fast" }).fps).toBe(DEFAULT_SERVER_FPS);
    expect(readConfig({ SERVER_FPS: "0" }).fps).toBe(DEFAULT_SERVER_FPS);
  });

  it("turns on flags only for the exact string true", () => {
    expect(readConfig({ ENABLE_CHEATS: "true", DEBUG: "true" })).toMatchObject({
      cheats: true,
      debug: true,
    });
    expect(readConfig({ ENABLE_CHEATS: "1", DEBUG: "yes" })).toMatchObject({
      cheats: false,
      debug: false,
    });
  });

  it("turns demo logins off in production", () => {
    expect(readConfig({ NODE_ENV: "production" })).toMatchObject({
      isProduction: true,
      allowDemo: false,
    });
  });

  it("uses AUTH_SECRET when set, and a random one only in production without it", () => {
    expect(readConfig({ AUTH_SECRET: "s", NODE_ENV: "production" })).toMatchObject({
      authSecret: "s",
      authSecretGenerated: false,
    });
    const a = readConfig({ NODE_ENV: "production" });
    const b = readConfig({ NODE_ENV: "production" });
    expect(a.authSecretGenerated).toBe(true);
    expect(a.authSecret).not.toBe(b.authSecret);
  });
});
