import { randomBytes } from "node:crypto";
import { z } from "zod";
import { DEFAULT_SERVER_FPS } from "@/network/sync/timing";

/*
 * Development falls back to a fixed secret, so remembered logins survive the dev server's
 * restarts. Production without AUTH_SECRET gets a random one: tokens die on every restart.
 */
const DEV_AUTH_SECRET = "aether-dev-auth-secret";

const text = z.string().optional();

/** The environment variables the server reads, as strings. Only `main.ts` reads `process.env`. */
const envSchema = z.object({
  PORT: text,
  PEER_SERVER_PORT: text,
  MONGO_URL: text,
  SERVER_URL: text,
  SERVER_FPS: text,
  PUBLIC_DIR: text,
  NODE_ENV: text,
  DEBUG: text,
  ENABLE_CHEATS: text,
  AUTH_SECRET: text,
});

/** Everything the server needs to boot, resolved once from the environment. */
export interface ServerConfig {
  /** Port to listen on. 0 picks a free one. Undefined lets node choose, as before. */
  port: number | string | undefined;
  /** Port of the peerjs server, or null to not start one. */
  peerPort: number | null;
  /** MongoDB url, or null to run offline with a fake database. */
  mongoUrl: string | null;
  serverUrl: string | undefined;
  /** Server ticks per second. */
  fps: number;
  /** Folder holding the maps and static files. */
  publicDir: string;
  isProduction: boolean;
  /** Demo logins (throwaway characters) are for development only. */
  allowDemo: boolean;
  /** Cheat chat commands (`/drop`, `/ding`...). */
  cheats: boolean;
  /** Verbose logging, and hit shapes sent to clients. */
  debug: boolean;
  /** Signs "remember me" tokens. */
  authSecret: string;
  /** True when production had no AUTH_SECRET and a random one was made, so tokens die on restart. */
  authSecretGenerated: boolean;
}

/** Reads the server's settings from an env-like object. Pass `process.env` from `main.ts`. */
export function readConfig(env: Record<string, string | undefined>): ServerConfig {
  const vars = envSchema.parse(env);
  const isProduction = vars.NODE_ENV === "production";
  const peerPort = parseInt(vars.PEER_SERVER_PORT ?? "", 10);

  let authSecret = vars.AUTH_SECRET || DEV_AUTH_SECRET;
  let authSecretGenerated = false;
  if (!vars.AUTH_SECRET && isProduction) {
    authSecret = randomBytes(32).toString("hex");
    authSecretGenerated = true;
  }

  return {
    port: vars.PORT,
    peerPort: Number.isNaN(peerPort) ? null : peerPort,
    mongoUrl: vars.MONGO_URL || null,
    serverUrl: vars.SERVER_URL,
    fps: parseInt(vars.SERVER_FPS || String(DEFAULT_SERVER_FPS), 10) || DEFAULT_SERVER_FPS,
    publicDir: vars.PUBLIC_DIR || "public",
    isProduction,
    allowDemo: !isProduction,
    cheats: vars.ENABLE_CHEATS === "true",
    debug: vars.DEBUG === "true",
    authSecret,
    authSecretGenerated,
  };
}
