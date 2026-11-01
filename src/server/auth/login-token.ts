import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/*
 * "Remember me" tokens: `email.expiresAt.signature`, signed with AUTH_SECRET. The signature also
 * covers the stored password, so changing it signs every remembered device out.
 */

const TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

/*
 * Development falls back to a fixed secret, so remembered logins survive the dev server's
 * restarts. Production without AUTH_SECRET gets a random one: tokens die on every restart.
 */
const DEV_SECRET = "aether-dev-auth-secret";

function getSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NODE_ENV !== "production") return DEV_SECRET;
  console.warn("⚠️ AUTH_SECRET is not set: remembered logins end when the server restarts");
  return randomBytes(32).toString("hex");
}

const SECRET = getSecret();

function sign(email: string, expiresAt: number, password: string) {
  return createHmac("sha256", SECRET)
    .update(`${email}\n${expiresAt}\n${password}`)
    .digest("base64url");
}

export function createLoginToken(email: string, password: string, now: number) {
  const expiresAt = now + TOKEN_LIFETIME_MS;
  const encodedEmail = Buffer.from(email).toString("base64url");
  return `${encodedEmail}.${expiresAt}.${sign(email, expiresAt, password)}`;
}

/** The email a token names, before it is checked. */
export function readLoginTokenEmail(token: string) {
  const [encodedEmail] = token.split(".");
  return encodedEmail ? Buffer.from(encodedEmail, "base64url").toString() : null;
}

export function isLoginTokenValid(token: string, password: string, now: number) {
  const [encodedEmail, expiresAtText, signature] = token.split(".");
  const expiresAt = Number(expiresAtText);
  if (!encodedEmail || !signature || !(expiresAt > now)) return false;
  const email = Buffer.from(encodedEmail, "base64url").toString();
  const expected = Buffer.from(sign(email, expiresAt, password));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
