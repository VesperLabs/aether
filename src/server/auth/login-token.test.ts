import { describe, expect, it } from "vitest";
import { createLoginToken, isLoginTokenValid, readLoginTokenEmail } from "./login-token";

const NOW = 1_000_000;
const SECRET = "test-secret";

describe("login tokens", () => {
  it("accepts its own token and reads the email back", () => {
    const token = createLoginToken("a@b.co", "secret", NOW, SECRET);
    expect(readLoginTokenEmail(token)).toBe("a@b.co");
    expect(isLoginTokenValid(token, "secret", NOW, SECRET)).toBe(true);
  });

  it("rejects a token after the password changes", () => {
    const token = createLoginToken("a@b.co", "secret", NOW, SECRET);
    expect(isLoginTokenValid(token, "other", NOW, SECRET)).toBe(false);
  });

  it("rejects an expired token", () => {
    const token = createLoginToken("a@b.co", "secret", NOW, SECRET);
    expect(isLoginTokenValid(token, "secret", NOW + 31 * 24 * 60 * 60 * 1000, SECRET)).toBe(false);
  });

  it("rejects a token pointed at another email", () => {
    const [, expiresAt, signature] = createLoginToken("a@b.co", "secret", NOW, SECRET).split(".");
    const forged = `${Buffer.from("c@d.co").toString("base64url")}.${expiresAt}.${signature}`;
    expect(isLoginTokenValid(forged, "secret", NOW, SECRET)).toBe(false);
  });

  it("rejects garbage", () => {
    expect(isLoginTokenValid("nope", "secret", NOW, SECRET)).toBe(false);
  });
});
