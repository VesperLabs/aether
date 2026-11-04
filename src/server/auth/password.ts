import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt) as (
  password: string,
  salt: string,
  length: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/** A password as it may be stored: `salt.key`. Async, so hashing never stalls the game loop. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const key = await derive(password, salt, KEY_LENGTH);
  return `${salt}.${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string | undefined) {
  const [salt, key] = stored?.split(".") ?? [];
  if (!salt || !key) return false;
  const expected = Buffer.from(key, "base64url");
  const actual = await derive(password, salt, KEY_LENGTH);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
