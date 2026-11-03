const DEV_PASSWORD = "botbot";

export interface AmbientConfig {
  count: number;
  password: string;
  port: number;
  graceMs: number;
}

/** Reads the ambient bot settings from env; throws on a bad count or a missing production password. */
export function readAmbientConfig(env: Record<string, string | undefined>): AmbientConfig {
  const count = Number(env.AMBIENT_BOTS ?? 3);
  if (!Number.isInteger(count) || count < 0)
    throw new Error(`Bad AMBIENT_BOTS: ${env.AMBIENT_BOTS}`);
  const isProduction = env.NODE_ENV === "production";
  if (count > 0 && isProduction && !env.BOT_PASSWORD) {
    throw new Error("BOT_PASSWORD must be set in production while AMBIENT_BOTS > 0");
  }
  return {
    count,
    password: env.BOT_PASSWORD || DEV_PASSWORD,
    port: Number(env.PORT || 8000),
    graceMs: Number(env.AMBIENT_GRACE_MS || 60_000),
  };
}
